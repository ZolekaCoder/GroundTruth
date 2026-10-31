import { randomUUID } from "node:crypto";
import { SemanticEvent, type Tool } from "@mozaik-ai/core";
import { getCase, sendEvent } from "./runtime.js";
import { excerpt, fetchSource, quoteIsGrounded, searchWikipedia } from "./sources.js";
import { log, publish } from "./bus.js";
import { ADVOCATES, type Advocate, type Bearing, type Filing, type Lead, type Role, type Stance, type Verdict } from "./types.js";

export const FILING_EVENT = "court.filing";
export const VERDICT_EVENT = "court.verdict";
export const LEAD_EVENT = "court.lead_report";
export const REBUTTAL_EVENT = "court.rebuttal";

const STANCES: Stance[] = ["supported", "contradicted", "misleading", "insufficient"];

// Tool-schema enums are advisory for some providers (the model has sent "contradicts" for
// "undermines"), so every enum is normalised or rejected here, server-side.
const BEARING_ALIASES: Record<string, Bearing> = {
  supports: "supports", support: "supports", confirms: "supports", supporting: "supports",
  undermines: "undermines", contradicts: "undermines", refutes: "undermines", contradicting: "undermines", undermining: "undermines",
  context: "context", qualifies: "context", contextual: "context", qualifying: "context",
};
const STANCE_ALIASES: Record<string, Stance> = {
  supported: "supported", true: "supported", contradicted: "contradicted", false: "contradicted",
  misleading: "misleading", "missing context": "misleading", insufficient: "insufficient", "insufficient evidence": "insufficient", unverifiable: "insufficient",
};
const asBearing = (v: unknown) => BEARING_ALIASES[String(v).toLowerCase().trim()];
const asStance = (v: unknown) => STANCE_ALIASES[String(v).toLowerCase().trim()];

function fn(name: string, description: string, properties: Record<string, any>, invoke: (args: any) => Promise<string>): Tool {
  return {
    type: "function",
    name,
    description,
    parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
    strict: true,
    invoke: async (args: any) => {
      try {
        return await invoke(args);
      } catch (err) {
        return `Tool error: ${(err as Error).message}`;
      }
    },
  };
}

function researchTools(caseId: string, role: Role, agentId: () => string): Tool[] {
  const c = () => getCase(caseId)!;
  return [
    fn("search_sources", "Search an encyclopedic index (Wikipedia) for sources relevant to a query. Returns titles, URLs and snippets. Snippets are NOT citable — open a result with read_source first.",
      { query: { type: "string", description: "A focused search query" } },
      async ({ query }) => {
        log(c(), role, "tool", `Searching: "${query}"`);
        const results = await searchWikipedia(query);
        if (!results.length) return "No results. Try a different query.";
        return results.map((r: any, i: number) => `${i + 1}. ${r.title} — ${r.url}\n   ${r.snippet}`).join("\n");
      }),
    fn("read_source", "Open a source by URL and read the passages most relevant to your focus. Only sources opened this way can be cited.",
      { url: { type: "string" }, focus: { type: "string", description: "What you are looking for in this source" } },
      async ({ url, focus }) => {
        log(c(), role, "tool", `Reading ${url.replace(/^https?:\/\//, "").slice(0, 70)}`);
        const s = await fetchSource(c(), url, role);
        publish(caseId);
        return `[${s.id}] ${s.title} (${s.publisher}${s.published ? `, last updated ${s.published.slice(0, 10)}` : ""})\n\n${excerpt(s, focus)}`;
      }),
    fn("cite_evidence", "Enter a verbatim quotation from a source you have read into the shared evidence ledger. All advocates and the Judge see the ledger.",
      {
        url: { type: "string", description: "URL of a source you opened with read_source" },
        quote: { type: "string", description: "Exact text copied from the source (1-3 sentences). Use ... to skip words." },
        bearing: { type: "string", enum: ["supports", "undermines", "context"], description: "How this bears on the claim" },
        relevance: { type: "string", description: "One sentence: why this matters to the claim" },
      },
      async ({ url, quote, bearing: rawBearing, relevance }) => {
        const k = c();
        const bearing = asBearing(rawBearing);
        if (!bearing) return 'Rejected: bearing must be exactly "supports", "undermines" or "context".';
        const source = k.sources.find((s) => s.url === url);
        if (!source) return "Rejected: you have not opened that URL with read_source in this case.";
        if (!quoteIsGrounded(source, quote)) return "Rejected: that quote does not appear verbatim in the source. Copy the exact wording.";
        const dup = k.evidence.find((e) => e.sourceId === source.id && e.quote === quote);
        if (dup) return `Already in the ledger as ${dup.id}.`;
        const ev = {
          id: `E${k.evidence.length + 1}`, sourceId: source.id, url, title: source.title, publisher: source.publisher,
          quote, bearing: bearing as Bearing, relevance, citedBy: role, at: Date.now(), round: k.round,
        };
        k.evidence.push(ev);
        log(k, role, "tool", `Entered ${ev.id} into evidence (${bearing})`);
        return `Accepted as ${ev.id}.`;
      }),
  ];
}

export function advocateTools(caseId: string, role: Advocate, agentId: () => string): Tool[] {
  const c = () => getCase(caseId)!;
  return [
    ...researchTools(caseId, role, agentId),
    fn("challenge", "Cross-examination only: directly challenge another advocate's argument, pointing to ledger evidence.",
      {
        target: { type: "string", enum: ADVOCATES.filter((a) => a !== role) },
        kind: { type: "string", enum: ["factual", "framing"], description: "factual = disputes what the evidence establishes; framing = disputes selection, emphasis or omission" },
        point: { type: "string", description: "The specific weakness, in one or two sentences" },
        evidence_ids: { type: "array", items: { type: "string" } },
      },
      async ({ target, kind, point, evidence_ids }) => {
        const k = c();
        if (k.phase !== "cross_examination" && k.phase !== "objection") return "Challenges are only allowed during cross-examination.";
        k.challenges.push({ id: `C${k.challenges.length + 1}`, round: k.round, from: role, to: target, kind: kind === "framing" ? "framing" : "factual", point, evidenceIds: evidence_ids.filter((id: string) => k.evidence.some((e) => e.id === id)), at: Date.now() });
        log(k, role, "said", `${kind === "framing" ? "Framing" : "Factual"} objection to the ${target}: ${point}`);
        return "Challenge recorded.";
      }),
    fn("raise_lead", "Record a question worth separate investigation (a source to trace, a figure to check, missing context). The editor decides which leads get pursued and by whom. At most 2 per round.",
      { question: { type: "string", description: "The lead, as a concrete research question" }, why: { type: "string", description: "One sentence: why it could change the outcome" } },
      async ({ question, why }) => {
        const k = c();
        if (!["investigation", "cross_examination", "objection"].includes(k.phase)) return "Leads can be raised while investigating or cross-examining.";
        if (k.leads.filter((l) => l.by === role && l.round === k.round).length >= 2) return "You already raised 2 leads this round.";
        const lead: Lead = { id: `L${k.leads.length + 1}`, by: role, question: question.slice(0, 240), why: why.slice(0, 240), at: Date.now(), round: k.round, status: "open" };
        k.leads.push(lead);
        log(k, role, "said", `Raised lead ${lead.id}: ${lead.question}`);
        return `Lead ${lead.id} recorded for the editor.`;
      }),
    fn("report_lead", "Report what you found on a lead the editor assigned to you. Call once per assigned lead, after researching it. A lead that goes nowhere is a valid finding.",
      { lead_id: { type: "string" }, finding: { type: "string", description: "What the evidence shows, under 70 words, citing evidence ids" }, evidence_ids: { type: "array", items: { type: "string" } } },
      async ({ lead_id, finding, evidence_ids }) => {
        const k = c();
        const lead = k.leads.find((l) => l.id === lead_id);
        if (!lead || lead.assignee !== role || lead.status !== "assigned") return "That lead is not assigned to you, or is already reported.";
        Object.assign(lead, { status: "reported", finding, evidenceIds: evidence_ids.filter((id: string) => k.evidence.some((e) => e.id === id)), reportedAt: Date.now() });
        log(k, role, "said", `Reported on ${lead.id}`);
        sendEvent(SemanticEvent.create(LEAD_EVENT, agentId(), { caseId, round: k.round, role, leadId: lead.id }), agentId());
        return "Lead reported. If you have no other assigned leads, reply with one short sentence and stop.";
      }),
    fn("rebut", "Respond to a challenge made against your position. Concede when the challenge is right.",
      { challenge_id: { type: "string" }, response: { type: "string", description: "Under 60 words" }, concede: { type: "boolean" } },
      async ({ challenge_id, response, concede }) => {
        const k = c();
        if (k.phase !== "rebuttal") return "Rebuttals happen in the rebuttal stage.";
        const ch = k.challenges.find((x) => x.id === challenge_id);
        if (!ch || ch.to !== role) return "That challenge was not made against you.";
        if (k.rebuttals.some((r) => r.challengeId === ch.id)) return "Already answered.";
        k.rebuttals.push({ id: randomUUID(), challengeId: ch.id, by: role, response, concede: !!concede, at: Date.now() });
        log(k, role, "said", `${concede ? "Concedes" : "Rebuts"} ${ch.id} from the ${ch.from}`);
        sendEvent(SemanticEvent.create(REBUTTAL_EVENT, agentId(), { caseId, round: k.round, role }), agentId());
        return "Recorded.";
      }),
    fn("file_position", "File your position for this round. Call exactly once per round, after researching. This ends your research for the round.",
      {
        stance: { type: "string", enum: STANCES },
        confidence: { type: "integer", description: "0-100: how strongly the evidence supports your stance" },
        argument: { type: "string", description: "Your argument, under 90 words, referring to evidence ids" },
        evidence_ids: { type: "array", items: { type: "string" } },
        what_changed: { type: "string", description: "If your stance or confidence moved since your last filing, what evidence moved it. Empty string on first filing or if unchanged." },
      },
      async ({ stance: rawStance, confidence, argument, evidence_ids, what_changed }) => {
        const k = c();
        const stance = asStance(rawStance);
        if (!stance) return `Rejected: stance must be one of ${STANCES.join(", ")}.`;
        if (!["investigation", "cross_examination", "objection"].includes(k.phase)) return "No position is due in this stage. Use the stage's own tool (report_lead or rebut).";
        if (k.filings.some((f) => f.role === role && f.round === k.round)) return "You already filed this round.";
        const prev = [...k.filings].reverse().find((f) => f.role === role);
        const filing: Filing = {
          role, round: k.round, stance, confidence: Math.max(0, Math.min(100, confidence)), argument,
          evidenceIds: evidence_ids.filter((id: string) => k.evidence.some((e) => e.id === id)),
          changed: !!prev && (prev.stance !== stance || Math.abs(prev.confidence - confidence) >= 15),
          whatChanged: what_changed || undefined, at: Date.now(),
        };
        k.filings.push(filing);
        log(k, role, "said", `Files: ${stance.toUpperCase()} (${filing.confidence}%)`);
        sendEvent(SemanticEvent.create(FILING_EVENT, agentId(), { caseId, round: k.round, role }), agentId());
        return "Position filed. Reply with one short sentence and stop.";
      }),
  ];
}

export function judgeTools(caseId: string, agentId: () => string): Tool[] {
  const c = () => getCase(caseId)!;
  return [
    fn("deliver_verdict", "Deliver the court's verdict. Every factual statement must rest on ledger evidence ids.",
      {
        verdict: { type: "string", enum: STANCES },
        confidence: { type: "integer", description: "0-100 confidence in the verdict given the evidence" },
        headline: { type: "string", description: "A newspaper-style verdict headline, max 12 words" },
        summary: { type: "string", description: "Two or three sentences a reader can share" },
        reasoning: { type: "string", description: "How the evidence was weighed, citing evidence ids, under 140 words" },
        key_evidence_ids: { type: "array", items: { type: "string" } },
        uncertainties: { type: "array", items: { type: "string" }, description: "What remains unknown or contestable" },
        framing_notes: { type: "array", items: { type: "string" }, description: "Editorial framing problems (selective quotation, omitted context, loaded wording), separate from factual errors. Empty if none." },
      },
      async (a) => {
        const k = c();
        if (k.verdicts.some((v) => v.round === k.round)) return "Verdict already delivered.";
        const verdict = asStance(a.verdict);
        if (!verdict) return `Rejected: verdict must be one of ${STANCES.join(", ")}.`;
        const v: Verdict = {
          round: k.round, verdict, confidence: Math.max(0, Math.min(100, a.confidence)), headline: a.headline,
          summary: a.summary, reasoning: a.reasoning, uncertainties: a.uncertainties, framingNotes: a.framing_notes ?? [], at: Date.now(),
          keyEvidenceIds: a.key_evidence_ids.filter((id: string) => k.evidence.some((e) => e.id === id)),
        };
        k.verdicts.push(v);
        log(k, "judge", "said", `Verdict: ${verdict.toUpperCase()}`);
        sendEvent(SemanticEvent.create(VERDICT_EVENT, agentId(), { caseId, round: k.round }), agentId());
        return "Verdict delivered. Reply with one short sentence and stop.";
      }),
  ];
}
