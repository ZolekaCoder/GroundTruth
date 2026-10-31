import { randomUUID } from "node:crypto";
import { createAgent, createHuman, SemanticEvent, SituationSpecification, type Agent, type SituationContext, type SituationHandler } from "@mozaik-ai/core";
import { getCase, join, MODEL, resolveRuntime, runLoop, sendEvent } from "./runtime.js";
import { PERSONAS, ROLE_NAMES } from "./personas.js";
import { advocateTools, FILING_EVENT, judgeTools, LEAD_EVENT, REBUTTAL_EVENT, VERDICT_EVENT } from "./tools.js";
import { log, publish } from "./bus.js";
import { excerpt, fetchSource } from "./sources.js";
import { ADVOCATES, type Advocate, type Case, type Lead, type Phase, type Role, type StageKind } from "./types.js";

export const SUMMONS_EVENT = "court.summons";
type Summons = { caseId: string; round: number; roles: Role[]; kind: StageKind; nudge?: boolean };

const DEADLINE_MS: Record<StageKind, number> = { file: 110_000, lead: 100_000, rebut: 75_000, verdict: 90_000 };
const SILENCE_MS = 20_000;
const MAX_NUDGES = 2;
const nudges = new Map<string, number>();
const FINISH_TOOL: Record<StageKind, string> = { file: "file_position", lead: "report_lead", rebut: "rebut", verdict: "deliver_verdict" };

/** "Am I being summoned?" — checked independently by every participant on every published event. */
class SummonedTo extends SituationSpecification {
  constructor(private caseId: string, private role: Role) { super(); }
  isSatisfiedBy({ event }: SituationContext) {
    if (event.type !== SUMMONS_EVENT) return false;
    const p = event.payload as Summons;
    return p.caseId === this.caseId && p.roles.includes(this.role);
  }
}

class CaseEvent extends SituationSpecification {
  constructor(private caseId: string, private types: string[]) { super(); }
  isSatisfiedBy({ event }: SituationContext) {
    return this.types.includes(event.type) && (event.payload as any)?.caseId === this.caseId;
  }
}

/** Mozaik loop telemetry from this case's agents: inference / tool calls / answers. */
class FromAgents extends SituationSpecification {
  constructor(private ids: () => string[]) { super(); }
  isSatisfiedBy({ event }: SituationContext) {
    return ["inference.started", "function_call.started", "model.answer"].includes(event.type) && this.ids().includes(event.producerId);
  }
}

function setPhase(c: Case, phase: Phase, text: string) {
  c.phase = phase;
  c.phaseLog.push({ phase, round: c.round, at: Date.now() });
  log(c, "clerk", "phase", text);
}

function roleBrief(c: Case, role: Role, kind: StageKind) {
  const round = c.round;
  const ledger = c.evidence.length
    ? c.evidence.map((e) => `${e.id} [${e.bearing}, cited by ${e.citedBy}] ${e.title} (${e.publisher}): "${e.quote}" — ${e.relevance}`).join("\n")
    : "(empty)";
  const filings = c.filings.map((f) => `Round ${f.round} · ${f.role}: ${f.stance.toUpperCase()} (${f.confidence}%)${f.timedOut ? " [did not file in time]" : ""} — ${f.argument} [evidence: ${f.evidenceIds.join(", ") || "none"}]`).join("\n") || "(none)";
  const challenges = c.challenges.map((x) => {
    const r = c.rebuttals.find((b) => b.challengeId === x.id);
    return `${x.id} ${x.from} → ${x.to} [${x.kind}]: ${x.point}${r ? `\n   ${r.concede ? "CONCEDED" : "REBUTTED"} by ${x.to}: ${r.response}` : ""}`;
  }).join("\n") || "(none)";
  const leads = c.leads.map((l) => `${l.id} (${l.status}${l.assignee ? `, assigned to ${l.assignee}` : ""}, raised by ${l.by}): ${l.question}${l.finding ? `\n   FINDING: ${l.finding} [${(l.evidenceIds ?? []).join(", ")}]` : ""}`).join("\n") || "(none)";
  const decisions = c.decisions.map((d) => `- ${d.detail}`).join("\n") || "(none)";
  const article = c.articleSourceId ? c.sources.find((s) => s.id === c.articleSourceId) : undefined;
  const head = `CASE ${c.id.slice(0, 8).toUpperCase()}\nCLAIM ON TRIAL: "${c.claim}"${article ? `\nThe claim comes from this article, already opened as ${article.id}: ${article.url}` : ""}`;
  const record = `SHARED EVIDENCE LEDGER:\n${ledger}\n\nFILINGS:\n${filings}\n\nCHALLENGES:\n${challenges}\n\nLEADS:\n${leads}`;

  if (kind === "verdict") {
    const lastObjection = c.objections.at(-1);
    return `${head}
${lastObjection && lastObjection.round === round ? `\nA READER HAS OBJECTED to the previous verdict: "${lastObjection.argument}"\nPrevious verdict: ${c.verdicts.at(-1)?.verdict} — ${c.verdicts.at(-1)?.reasoning}\n` : ""}
${record}

EDITOR'S DECISIONS (editorial direction, not evidence):\n${decisions}

Weigh the evidence and call deliver_verdict exactly once. If the ledger cannot settle the claim, the verdict is "insufficient". Note where advocates agreed without strong evidence, and whether conceded challenges changed anything. Keep factual findings and framing problems apart: put selective quotation, omitted context or loaded wording in framing_notes.`;
  }

  if (kind === "lead") {
    const mine = c.leads.filter((l) => l.assignee === role && l.status === "assigned");
    return `${head}\n\n${record}\n\nEDITOR'S ASSIGNMENT. The editor has assigned you ${mine.length > 1 ? "these leads" : "this lead"}:\n${mine.map((l) => `${l.id}: ${l.question}\n   (raised by ${l.by === "editor" ? "the editor" : `the ${l.by}`}: ${l.why})`).join("\n")}
Other desks may be working other leads at the same time. Research yours (search_sources, read_source, cite_evidence), then call report_lead for each. Report honestly even if the lead goes nowhere.`;
  }

  if (kind === "rebut") {
    const against = c.challenges.filter((x) => x.to === role && !c.rebuttals.some((r) => r.challengeId === x.id));
    return `${head}\n\n${record}\n\nREBUTTAL. These challenges were made against your position:\n${against.map((x) => `${x.id} from the ${x.from} [${x.kind}]: ${x.point}`).join("\n")}
Answer each with rebut. Set concede=true where the challenge is right: conceding a fair point strengthens the court's work. Be brief.`;
  }

  if (round === 1) {
    return `${head}\n${article ? `\nArticle excerpt:\n${excerpt(article, c.claim, 2500)}\n` : ""}
INVESTIGATION PHASE. You are working at the same time as the other advocates; everything you cite goes into a shared ledger they can see.
Research the claim with search_sources and read_source, enter 2-4 verbatim quotes with cite_evidence. If you spot a question worth separate research (a figure to trace, a primary document, missing context), record it with raise_lead — the editor decides which leads get pursued. Then call file_position.`;
  }

  const objection = c.objections.find((o) => o.round === round);
  const task = objection
    ? `OBJECTION. A reader challenges the verdict: "${objection.argument}"${objection.url ? `\nThey submitted a source, already opened for you as ${c.sources.find((s) => s.url === objection.url)?.id ?? objection.url}. Read it with read_source.` : ""}
Previous verdict: ${c.verdicts.at(-1)?.verdict} (${c.verdicts.at(-1)?.confidence}%).
Reconsider honestly. If the objection or new evidence changes your view, change your stance and explain exactly what changed in what_changed. If it doesn't, say why.`
    : `CROSS-EXAMINATION PHASE. Read the filings, lead findings and the shared ledger.
Use challenge (marking it factual or framing) to attack the weakest point in at least one other advocate's argument — challenged advocates will get to rebut. You may research further and cite new evidence. Then call file_position again. If the evidence (including lead findings) moved you, change your stance and explain in what_changed.`;

  return `${head}\n\n${record}\n\n${task}`;
}

const clerks = new Map<string, string>();

function summon(c: Case, roles: Role[], kind: StageKind) {
  const clerk = clerks.get(c.id)!;
  c.stage = { kind, roles, round: c.round };
  for (const r of roles) c.busy[r] = Date.now();
  // One summons event, many listeners: each agent's specification matches independently and
  // each starts its own Mozaik loop — they run concurrently, not in sequence.
  sendEvent(SemanticEvent.create(SUMMONS_EVENT, clerk, { caseId: c.id, round: c.round, roles, kind } satisfies Summons), clerk);
  const round = c.round;
  setTimeout(() => watchdog(c.id, round), DEADLINE_MS[kind]);
  monitorStalls(c.id, round);
}

function hasFinished(c: Case, role: Role, kind: StageKind, round: number) {
  switch (kind) {
    case "verdict": return c.verdicts.some((v) => v.round === round);
    case "file": return c.filings.some((f) => f.role === role && f.round === round);
    case "lead": return !c.leads.some((l) => l.assignee === role && l.status === "assigned");
    case "rebut": return c.challenges.filter((x) => x.to === role).every((x) => c.rebuttals.some((r) => r.challengeId === x.id));
  }
}

/**
 * A Mozaik loop can die silently (e.g. the model returns an empty reply and the loop has no
 * transition for it). A live agent shows activity every few seconds, so prolonged silence from an
 * agent that hasn't finished means its loop is gone: re-summon just that agent with a nudge.
 */
function monitorStalls(caseId: string, round: number) {
  const iv = setInterval(() => {
    const c = getCase(caseId);
    if (!c || !c.stage || c.stage.round !== round || c.phase === "failed" || c.phase === "awaiting_editor") return clearInterval(iv);
    const { kind, roles } = c.stage;
    const pending = roles.filter((r) => !hasFinished(c, r, kind, round));
    if (!pending.length) return clearInterval(iv);
    for (const role of pending) {
      const last = Math.max(...c.activity.filter((a) => a.role === role || (a.role === "clerk" && a.kind === "phase")).map((a) => a.at));
      const key = `${caseId}:${round}:${role}`;
      const used = nudges.get(key) ?? 0;
      if (Date.now() - last < SILENCE_MS || used >= MAX_NUDGES) continue;
      nudges.set(key, used + 1);
      const open = c.turns.find((t) => t.role === role && !t.endedAt);
      if (open) open.endedAt = Date.now();
      log(c, "clerk", "error", `${ROLE_NAMES[role]} went silent. The clerk calls them back.`);
      const clerk = clerks.get(caseId)!;
      sendEvent(SemanticEvent.create(SUMMONS_EVENT, clerk, { caseId, round, roles: [role], kind, nudge: true } satisfies Summons), clerk);
    }
  }, 4000);
}

/** Deadline: record what didn't happen (never invent it), then let the case move on. */
function watchdog(caseId: string, round: number) {
  const c = getCase(caseId);
  if (!c || !c.stage || c.stage.round !== round || c.phase === "awaiting_editor") return;
  const { kind, roles } = c.stage;
  for (const role of roles) {
    if (hasFinished(c, role, kind, round)) continue;
    if (kind === "verdict") {
      setPhase(c, "failed", "The Judge did not deliver a verdict in time.");
      c.error = "The Judge did not deliver a verdict in time (model or network failure). No verdict has been invented — retry the case.";
      return;
    }
    if (kind === "file") {
      c.filings.push({ role: role as Advocate, round, stance: "insufficient", confidence: 0, argument: "Did not file a position before the deadline. No position is recorded for this advocate.", evidenceIds: [], changed: false, at: Date.now(), timedOut: true });
    } else if (kind === "lead") {
      for (const l of c.leads.filter((l) => l.assignee === role && l.status === "assigned")) Object.assign(l, { status: "dropped", finding: "No report before the deadline.", reportedAt: Date.now() });
    } else {
      for (const x of c.challenges.filter((x) => x.to === role && !c.rebuttals.some((r) => r.challengeId === x.id)))
        c.rebuttals.push({ id: randomUUID(), challengeId: x.id, by: role as Advocate, response: "No response before the deadline.", concede: false, at: Date.now(), timedOut: true });
    }
    log(c, "clerk", "error", `${ROLE_NAMES[role]} missed the deadline.`);
  }
  advance(c);
}

/** Called whenever something that could finish a stage happens. Moves the case on when it's done. */
function advance(c: Case) {
  if (!c.stage || c.phase === "failed" || c.phase === "awaiting_editor") return;
  const { kind, roles, round } = c.stage;
  if (round !== c.round || !roles.every((r) => hasFinished(c, r, kind, round))) return;
  // A loop can die after its agent has finished; once the stage is decided, close any
  // turn that never reported back so the room doesn't show a ghost "working" agent.
  for (const t of c.turns) if (!t.endedAt) t.endedAt = Date.now();
  c.busy = {};
  c.stage = undefined;

  if (kind === "verdict") return setPhase(c, "verdict", "The court has reached a verdict.");
  if (kind === "lead") return c.afterLeads === "cross_examination" ? startCross(c) : editorPause(c, "before_verdict");
  if (kind === "rebut") return editorPause(c, "before_verdict");
  // kind === "file"
  if (c.phase === "investigation") return editorPause(c, "after_investigation");
  if (c.phase === "objection") { setPhase(c, "deliberation", "The Judge reconsiders the objection."); return summon(c, ["judge"], "verdict"); }
  const targets = [...new Set(c.challenges.filter((x) => x.round === round).map((x) => x.to))];
  if (targets.length) {
    c.round += 1;
    setPhase(c, "rebuttal", `Rebuttal: ${targets.map((t) => ROLE_NAMES[t]).join(", ")} answer${targets.length === 1 ? "s" : ""} the challenges.`);
    return summon(c, targets, "rebut");
  }
  editorPause(c, "before_verdict");
}

function startCross(c: Case) {
  c.round += 1;
  setPhase(c, "cross_examination", "Cross-examination begins.");
  summon(c, [...ADVOCATES], "file");
}

function editorPause(c: Case, pending: NonNullable<Case["pending"]>) {
  c.pending = pending;
  setPhase(c, "awaiting_editor", pending === "after_investigation" ? "First reports are in. Your call, editor: which leads do we chase?" : "The record is complete. Your call, editor: send it to the judge, or keep reporting?");
  if (c.autopilot) setTimeout(() => autopilotDecision(c), 1200);
}

/** Headless scripts only: take the editor's decision the way a cautious editor would. */
function autopilotDecision(c: Case) {
  if (c.phase !== "awaiting_editor") return;
  if (c.pending === "after_investigation") {
    const open = c.leads.filter((l) => l.status === "open").slice(0, 2);
    const picks = open.length
      ? open.map((l, i) => ({ leadId: l.id, assignee: (["investigator", "prosecutor"] as Advocate[])[i] }))
      : [{ question: `What does the primary source behind "${c.claim.slice(0, 80)}" actually say, in full?`, assignee: "investigator" as Advocate }];
    decide(c.id, { action: "pursue", leads: picks }).catch((e) => log(c, "clerk", "error", `Autopilot: ${e.message}`));
  } else {
    decide(c.id, { action: "call_judge" }).catch((e) => log(c, "clerk", "error", `Autopilot: ${e.message}`));
  }
}

export type EditorDecision =
  | { action: "pursue"; leads: { leadId?: string; question?: string; assignee: Advocate }[] }
  | { action: "proceed" }
  | { action: "call_judge" };

/** The user, as editor, steers the investigation. */
export async function decide(caseId: string, d: EditorDecision) {
  const c = getCase(caseId);
  if (!c) throw new Error("No such case.");
  if (c.phase !== "awaiting_editor") throw new Error("The court isn't waiting on an editor's decision right now.");
  if (d.action === "pursue") {
    if (!d.leads?.length || d.leads.length > 3) throw new Error("Assign between one and three leads.");
    const assigned: Lead[] = [];
    for (const p of d.leads) {
      if (!ADVOCATES.includes(p.assignee)) throw new Error("Assign each lead to the prosecutor, defender or investigator.");
      let lead = p.leadId ? c.leads.find((l) => l.id === p.leadId && l.status === "open") : undefined;
      if (p.leadId && !lead) throw new Error(`Lead ${p.leadId} isn't open.`);
      if (!lead) {
        const q = (p.question ?? "").trim().slice(0, 240);
        if (q.length < 8) throw new Error("Write the lead as a question.");
        lead = { id: `L${c.leads.length + 1}`, by: "editor", question: q, why: "The editor wants this checked.", at: Date.now(), round: c.round, status: "open" };
        c.leads.push(lead);
      }
      Object.assign(lead, { status: "assigned", assignee: p.assignee, assignedAt: Date.now() });
      assigned.push(lead);
    }
    c.decisions.push({ at: Date.now(), action: "pursue", detail: `Editor assigned ${assigned.map((l) => `${l.id} to the ${l.assignee}`).join(" and ")}.` });
    c.afterLeads = c.pending === "after_investigation" ? "cross_examination" : "before_verdict";
    c.pending = undefined;
    c.round += 1;
    const desks = [...new Set(assigned.map((l) => l.assignee!))];
    setPhase(c, "leads", `Following ${assigned.length === 1 ? "a lead" : `${assigned.length} leads`}: ${desks.map((r) => ROLE_NAMES[r]).join(" and ")}.`);
    summon(c, desks, "lead");
  } else if (d.action === "proceed") {
    if (c.pending !== "after_investigation") throw new Error("Nothing to proceed to.");
    c.decisions.push({ at: Date.now(), action: "proceed", detail: "Editor sent the case straight to cross-examination." });
    c.pending = undefined;
    startCross(c);
  } else {
    if (c.pending !== "before_verdict") throw new Error("The record isn't ready for the judge yet.");
    c.decisions.push({ at: Date.now(), action: "call_judge", detail: "Editor sent the case to the judge." });
    c.pending = undefined;
    setPhase(c, "deliberation", "The Judge retires to weigh the evidence.");
    summon(c, ["judge"], "verdict");
  }
  return c;
}

/** The Clerk is a Mozaik human participant: it never infers, it only moves the case forward on events. */
function buildClerk(caseId: string, agents: Record<Role, Agent>) {
  const ids = () => Object.values(agents).map((a) => a.getId());
  const roleOf = (id: string) => (Object.entries(agents).find(([, a]) => a.getId() === id)?.[0] as Role | undefined);

  const procedure: SituationHandler = {
    specification: new CaseEvent(caseId, [FILING_EVENT, VERDICT_EVENT, LEAD_EVENT, REBUTTAL_EVENT]),
    processor: { apply() { const c = getCase(caseId); if (c) advance(c); } },
  };

  const telemetry: SituationHandler = {
    specification: new FromAgents(ids),
    processor: {
      apply({ event }) {
        const c = getCase(caseId);
        const role = roleOf(event.producerId);
        if (!c || !role) return;
        if (event.type === "inference.started") {
          const open = c.turns.find((t) => t.role === role && !t.endedAt);
          if (!open) c.turns.push({ role, round: c.round, startedAt: Date.now() });
          c.busy[role] ??= Date.now();
          log(c, role, "thinking", "Reasoning…");
        } else if (event.type === "model.answer") {
          const text = (event.payload as any)?.answer?.content?.text ?? "";
          const open = c.turns.find((t) => t.role === role && !t.endedAt);
          if (open) open.endedAt = Date.now();
          delete c.busy[role];
          if (text) log(c, role, "said", text.slice(0, 280));
          else publish(caseId);
        }
      },
    },
  };

  const clerk = createHuman({ name: `Clerk ${caseId.slice(0, 6)}`, capabilities: [], handlers: [procedure, telemetry] });
  clerks.set(caseId, clerk.getId());
  return clerk;
}

function buildAgent(caseId: string, role: Role) {
  let self: Agent;
  const id = () => self.getId();
  const handler: SituationHandler = {
    specification: new SummonedTo(caseId, role),
    processor: {
      apply({ event }) {
        const c = getCase(caseId)!;
        const { kind, nudge } = event.payload as Summons;
        const prefix = nudge ? `You were interrupted before finishing. Do not repeat earlier research. Call ${FINISH_TOOL[kind]} now.\n\n` : "";
        runLoop(self.getId(), prefix + roleBrief(c, role, kind), {
          model: MODEL,
          maxOutputTokens: 1500,
          context: self.getMemory().getContext(),
          tools: self.getTools(),
        });
      },
    },
  };
  self = createAgent({
    name: ROLE_NAMES[role],
    capabilities: ["inference"],
    instruction: PERSONAS[role],
    tools: role === "judge" ? judgeTools(caseId, id) : advocateTools(caseId, role, id),
    handlers: [handler],
  });
  return self;
}

export async function openCase(input: { claim?: string; url?: string; text?: string }, opts: { autopilot?: boolean } = {}) {
  const id = randomUUID();
  const c: Case = {
    id, claim: (input.claim || input.text || "").trim().slice(0, 600), articleUrl: input.url || undefined,
    openedAt: Date.now(), phase: "opening", round: 1, sources: [], evidence: [], filings: [], challenges: [],
    verdicts: [], objections: [], activity: [], leads: [], rebuttals: [], decisions: [], phaseLog: [],
    agentIds: {}, busy: {}, turns: [], autopilot: opts.autopilot,
  };
  resolveRuntime().state.cases.set(id, c);
  log(c, "clerk", "phase", "Case opened.");

  if (c.articleUrl) {
    try {
      const s = await fetchSource(c, c.articleUrl, "clerk");
      c.articleSourceId = s.id;
      if (!c.claim) c.claim = s.title;
      log(c, "clerk", "tool", `Exhibit ${s.id} entered: ${s.title}`);
    } catch (err) {
      log(c, "clerk", "error", `Could not retrieve the article: ${(err as Error).message}`);
      if (!c.claim) throw new Error("Could not retrieve that article and no claim text was given.");
    }
  }
  if (!c.claim) throw new Error("A claim or article URL is required.");

  const agents = Object.fromEntries((["prosecutor", "defender", "investigator", "judge"] as Role[]).map((r) => [r, buildAgent(id, r)])) as Record<Role, Agent>;
  for (const [r, a] of Object.entries(agents)) c.agentIds[r as Role] = a.getId();
  join(buildClerk(id, agents));
  for (const a of Object.values(agents)) join(a);

  setPhase(c, "investigation", "Three reporters begin investigating at once.");
  summon(c, [...ADVOCATES], "file");
  return c;
}

export async function raiseObjection(caseId: string, argument: string, url?: string) {
  const c = getCase(caseId);
  if (!c) throw new Error("No such case.");
  if (c.phase !== "verdict") throw new Error("Objections can only be raised after a verdict.");
  c.round += 1;
  c.objections.push({ round: c.round, argument: argument.slice(0, 1000), url: url || undefined, at: Date.now() });
  c.decisions.push({ at: Date.now(), action: "objection", detail: `Editor reopened the case: "${argument.slice(0, 160)}"` });
  setPhase(c, "objection", "Objection! The case is reopened.");
  if (url) {
    try {
      const s = await fetchSource(c, url, "clerk");
      log(c, "clerk", "tool", `Reader's exhibit ${s.id} entered: ${s.title}`);
    } catch (err) {
      log(c, "clerk", "error", `Could not retrieve the submitted source: ${(err as Error).message}`);
    }
  }
  summon(c, [...ADVOCATES], "file");
  return c;
}

/**
 * runLoop is fire-and-forget, so provider failures surface as unhandled rejections with no case id.
 * Non-retryable ones (bad key, no credit) will fail every open case identically — say so at once
 * rather than letting each case wait out its deadlines.
 */
export let providerError: string | null = null;
export function reportProviderFailure(reason: unknown) {
  const err = reason as { status?: number; error?: { error?: { message?: string } }; message?: string };
  if (!err?.status || ![400, 401, 403, 404].includes(err.status)) return;
  providerError = `The model provider rejected the request: ${err.error?.error?.message ?? err.message ?? "unknown error"}`;
  for (const c of resolveRuntime().state.cases.values()) {
    if (c.phase === "verdict" || c.phase === "failed") continue;
    c.phase = "failed";
    c.error = `${providerError} No positions or verdict have been invented.`;
    c.busy = {};
    log(c, "clerk", "error", c.error);
  }
}
