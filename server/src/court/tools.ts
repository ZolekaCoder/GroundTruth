import { randomUUID } from "node:crypto";
import { SemanticEvent, type Tool } from "@mozaik-ai/core";
import { getCase, sendEvent } from "./runtime.js";
import { excerpt, fetchSource, quoteIsGrounded, searchWikipedia } from "./sources.js";
import { log, publish } from "./bus.js";
import { ADVOCATES, type Advocate, type Bearing, type Filing, type Role, type Stance, type Verdict } from "./types.js";

export const FILING_EVENT = "court.filing";
export const VERDICT_EVENT = "court.verdict";

const STANCES: Stance[] = ["supported", "contradicted", "misleading", "insufficient"];

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
      async ({ url, quote, bearing, relevance }) => {
        const k = c();
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
        if (k.round < 2) return "Challenges are only allowed during cross-examination.";
        k.challenges.push({ id: randomUUID(), from: role, to: target, kind: kind === "framing" ? "framing" : "factual", point, evidenceIds: evidence_ids.filter((id: string) => k.evidence.some((e) => e.id === id)), at: Date.now() });
        log(k, role, "said", `${kind === "framing" ? "Framing" : "Factual"} objection to the ${target}: ${point}`);
        return "Challenge recorded.";
      }),
    fn("file_position", "File your position for this round. Call exactly once per round, after researching. This ends your research for the round.",
      {
        stance: { type: "string", enum: STANCES },
        confidence: { type: "integer", description: "0-100: how strongly the evidence supports your stance" },
        argument: { type: "string", description: "Your argument, under 90 words, referring to evidence ids" },
        evidence_ids: { type: "array", items: { type: "string" } },
        what_changed: { type: "string", description: "If your stance or confidence moved since your last filing, what evidence moved it. Empty string on first filing or if unchanged." },
      },
      async ({ stance, confidence, argument, evidence_ids, what_changed }) => {
        const k = c();
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
        const v: Verdict = {
          round: k.round, verdict: a.verdict, confidence: Math.max(0, Math.min(100, a.confidence)), headline: a.headline,
          summary: a.summary, reasoning: a.reasoning, uncertainties: a.uncertainties, framingNotes: a.framing_notes ?? [], at: Date.now(),
          keyEvidenceIds: a.key_evidence_ids.filter((id: string) => k.evidence.some((e) => e.id === id)),
        };
        k.verdicts.push(v);
        log(k, "judge", "said", `Verdict: ${a.verdict.toUpperCase()}`);
        sendEvent(SemanticEvent.create(VERDICT_EVENT, agentId(), { caseId, round: k.round }), agentId());
        return "Verdict delivered. Reply with one short sentence and stop.";
      }),
  ];
}
