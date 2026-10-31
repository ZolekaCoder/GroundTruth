import { randomUUID } from "node:crypto";
import { createAgent, createHuman, SemanticEvent, SituationSpecification, type Agent, type SituationContext, type SituationHandler } from "@mozaik-ai/core";
import { getCase, join, MODEL, resolveRuntime, runLoop, sendEvent } from "./runtime.js";
import { PERSONAS, ROLE_NAMES } from "./personas.js";
import { advocateTools, FILING_EVENT, judgeTools, VERDICT_EVENT } from "./tools.js";
import { log, publish } from "./bus.js";
import { excerpt, fetchSource } from "./sources.js";
import { ADVOCATES, type Advocate, type Case, type Role } from "./types.js";

export const SUMMONS_EVENT = "court.summons";
type Summons = { caseId: string; round: number; roles: Role[]; brief: string; nudge?: boolean };

const ADVOCATE_DEADLINE_MS = 110_000;
const SILENCE_MS = 20_000;
const MAX_NUDGES = 2;
const nudges = new Map<string, number>();
const JUDGE_DEADLINE_MS = 90_000;

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

function roleBrief(c: Case, role: Role, round: number) {
  const ledger = c.evidence.length
    ? c.evidence.map((e) => `${e.id} [${e.bearing}, cited by ${e.citedBy}] ${e.title} (${e.publisher}): "${e.quote}" — ${e.relevance}`).join("\n")
    : "(empty)";
  const filings = c.filings.map((f) => `Round ${f.round} · ${f.role}: ${f.stance.toUpperCase()} (${f.confidence}%)${f.timedOut ? " [did not file in time]" : ""} — ${f.argument} [evidence: ${f.evidenceIds.join(", ") || "none"}]`).join("\n") || "(none)";
  const challenges = c.challenges.map((x) => `${x.from} → ${x.to} [${x.kind}]: ${x.point}`).join("\n") || "(none)";
  const article = c.articleSourceId ? c.sources.find((s) => s.id === c.articleSourceId) : undefined;
  const head = `CASE ${c.id.slice(0, 8).toUpperCase()}\nCLAIM ON TRIAL: "${c.claim}"${article ? `\nThe claim comes from this article, already opened as ${article.id}: ${article.url}` : ""}`;

  if (role === "judge") {
    const lastObjection = c.objections.at(-1);
    return `${head}
${lastObjection && lastObjection.round === round ? `\nA READER HAS OBJECTED to the previous verdict: "${lastObjection.argument}"\nPrevious verdict: ${c.verdicts.at(-1)?.verdict} — ${c.verdicts.at(-1)?.reasoning}\n` : ""}
VERIFIED EVIDENCE LEDGER:\n${ledger}\n\nADVOCATE FILINGS:\n${filings}\n\nCROSS-EXAMINATION CHALLENGES:\n${challenges}

Weigh the evidence and call deliver_verdict exactly once. If the ledger cannot settle the claim, the verdict is "insufficient". Note where advocates agreed without strong evidence. Keep factual findings and framing problems apart: put selective quotation, omitted context or loaded wording in framing_notes.`;
  }

  if (round === 1) {
    return `${head}\n${article ? `\nArticle excerpt:\n${excerpt(article, c.claim, 2500)}\n` : ""}
INVESTIGATION PHASE. You are working at the same time as the other advocates; everything you cite goes into a shared ledger they can see.
Research the claim with search_sources and read_source, enter 2-4 verbatim quotes with cite_evidence, then call file_position.`;
  }

  const objection = c.objections.find((o) => o.round === round);
  const task = objection
    ? `OBJECTION. A reader challenges the verdict: "${objection.argument}"${objection.url ? `\nThey submitted a source, already opened for you as ${c.sources.find((s) => s.url === objection.url)?.id ?? objection.url}. Read it with read_source.` : ""}
Previous verdict: ${c.verdicts.at(-1)?.verdict} (${c.verdicts.at(-1)?.confidence}%).
Reconsider honestly. If the objection or new evidence changes your view, change your stance and explain exactly what changed in what_changed. If it doesn't, say why.`
    : `CROSS-EXAMINATION PHASE. Read the other advocates' filings and the shared ledger below.
Use challenge (marking it factual or framing) to attack the weakest point in at least one other advocate's argument. You may research further and cite new evidence. Then call file_position again. If the evidence moved you, change your stance and explain in what_changed — changing your mind when the evidence demands it is a strength.`;

  return `${head}\n\nSHARED EVIDENCE LEDGER:\n${ledger}\n\nFILINGS SO FAR:\n${filings}\n\nCHALLENGES:\n${challenges}\n\n${task}`;
}

function summon(c: Case, roles: Role[]) {
  const clerk = clerks.get(c.id)!;
  for (const r of roles) c.busy[r] = Date.now();
  // One summons event, many listeners: each agent's specification matches independently and
  // each starts its own Mozaik loop — they run concurrently, not in sequence.
  sendEvent(SemanticEvent.create(SUMMONS_EVENT, clerk, { caseId: c.id, round: c.round, roles, brief: "" } satisfies Summons), clerk);
  const round = c.round;
  const isJudge = roles.includes("judge");
  setTimeout(() => watchdog(c.id, round, roles), isJudge ? JUDGE_DEADLINE_MS : ADVOCATE_DEADLINE_MS);
  monitorStalls(c.id, round, roles);
}

function hasFinished(c: Case, role: Role, round: number) {
  return role === "judge" ? c.verdicts.some((v) => v.round === round) : c.filings.some((f) => f.role === role && f.round === round);
}

/**
 * A Mozaik loop can die silently (e.g. the model returns an empty reply and the loop has no
 * transition for it). A live agent shows activity every few seconds, so prolonged silence from an
 * agent that hasn't finished means its loop is gone: re-summon just that agent with a nudge.
 */
function monitorStalls(caseId: string, round: number, roles: Role[]) {
  const iv = setInterval(() => {
    const c = getCase(caseId);
    if (!c || c.round !== round || c.phase === "failed") return clearInterval(iv);
    const pending = roles.filter((r) => !hasFinished(c, r, round));
    if (!pending.length) return clearInterval(iv);
    for (const role of pending) {
      const last = Math.max(...c.activity.filter((a) => a.role === role || (a.role === "clerk" && a.kind === "phase")).map((a) => a.at));
      const key = `${caseId}:${round}:${role}`;
      const used = nudges.get(key) ?? 0;
      if (Date.now() - last < SILENCE_MS || used >= MAX_NUDGES) continue;
      nudges.set(key, used + 1);
      const open = c.turns.find((t) => t.role === role && !t.endedAt);
      if (open) open.endedAt = Date.now();
      log(c, "clerk", "error", `${ROLE_NAMES[role]} went silent. The clerk calls them back to the stand.`);
      const clerk = clerks.get(caseId)!;
      sendEvent(SemanticEvent.create(SUMMONS_EVENT, clerk, { caseId, round, roles: [role], brief: "", nudge: true } satisfies Summons), clerk);
    }
  }, 4000);
}

function watchdog(caseId: string, round: number, roles: Role[]) {
  const c = getCase(caseId);
  if (!c || c.round !== round) return;
  if (roles.includes("judge")) {
    if (!c.verdicts.some((v) => v.round === round)) {
      c.phase = "failed";
      c.error = "The Judge did not deliver a verdict in time (model or network failure). No verdict has been invented — retry the case.";
      log(c, "clerk", "error", c.error);
    }
    return;
  }
  const clerk = clerks.get(caseId)!;
  for (const role of roles as Advocate[]) {
    if (c.filings.some((f) => f.role === role && f.round === round)) continue;
    c.filings.push({ role, round, stance: "insufficient", confidence: 0, argument: "Did not file a position before the deadline. No position is recorded for this advocate.", evidenceIds: [], changed: false, at: Date.now(), timedOut: true });
    log(c, "clerk", "error", `${ROLE_NAMES[role]} missed the deadline.`);
    sendEvent(SemanticEvent.create(FILING_EVENT, clerk, { caseId, round, role }), clerk);
  }
}

const clerks = new Map<string, string>();

/** The Clerk is a Mozaik human participant: it never infers, it only moves the case forward on events. */
function buildClerk(caseId: string, agents: Record<Role, Agent>) {
  const ids = () => Object.values(agents).map((a) => a.getId());
  const roleOf = (id: string) => (Object.entries(agents).find(([, a]) => a.getId() === id)?.[0] as Role | undefined);

  const procedure: SituationHandler = {
    specification: new CaseEvent(caseId, [FILING_EVENT, VERDICT_EVENT]),
    processor: {
      apply({ event }) {
        const c = getCase(caseId)!;
        const { round } = event.payload as { round: number };
        if (round !== c.round) return;
        // A loop can die after its agent has already filed; once the round is decided, close any
        // turn that never reported back so the timeline doesn't show a ghost "working" agent.
        const closeOpenTurns = () => { for (const t of c.turns) if (!t.endedAt) t.endedAt = Date.now(); c.busy = {}; };
        if (event.type === VERDICT_EVENT) {
          closeOpenTurns();
          c.phase = "verdict";
          delete c.busy.judge;
          log(c, "clerk", "phase", "The court has reached a verdict.");
          return;
        }
        const filed = new Set(c.filings.filter((f) => f.round === round).map((f) => f.role));
        if (!ADVOCATES.every((a) => filed.has(a))) return;
        closeOpenTurns();
        if (round === 1) {
          c.round = 2;
          c.phase = "cross_examination";
          log(c, "clerk", "phase", "All positions filed. Cross-examination begins.");
          summon(c, [...ADVOCATES]);
        } else {
          c.phase = "deliberation";
          log(c, "clerk", "phase", "The Judge retires to weigh the evidence.");
          summon(c, ["judge"]);
        }
      },
    },
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
        const nudge = (event.payload as Summons).nudge
          ? `You were interrupted before finishing this round. Do not repeat earlier research. Call ${role === "judge" ? "deliver_verdict" : "file_position"} now.\n\n`
          : "";
        runLoop(self.getId(), nudge + roleBrief(c, role, c.round), {
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

export async function openCase(input: { claim?: string; url?: string; text?: string }) {
  const id = randomUUID();
  const c: Case = {
    id, claim: (input.claim || input.text || "").trim().slice(0, 600), articleUrl: input.url || undefined,
    openedAt: Date.now(), phase: "opening", round: 1, sources: [], evidence: [], filings: [], challenges: [],
    verdicts: [], objections: [], activity: [], agentIds: {}, busy: {}, turns: [],
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

  c.phase = "investigation";
  log(c, "clerk", "phase", "Three advocates begin investigating at once.");
  summon(c, [...ADVOCATES]);
  return c;
}

export async function raiseObjection(caseId: string, argument: string, url?: string) {
  const c = getCase(caseId);
  if (!c) throw new Error("No such case.");
  if (c.phase !== "verdict") throw new Error("Objections can only be raised after a verdict.");
  c.round += 1;
  c.phase = "objection";
  c.objections.push({ round: c.round, argument: argument.slice(0, 1000), url: url || undefined, at: Date.now() });
  log(c, "clerk", "phase", "Objection! The advocates must reconsider.");
  if (url) {
    try {
      const s = await fetchSource(c, url, "clerk");
      log(c, "clerk", "tool", `Reader's exhibit ${s.id} entered: ${s.title}`);
    } catch (err) {
      log(c, "clerk", "error", `Could not retrieve the submitted source: ${(err as Error).message}`);
    }
  }
  summon(c, [...ADVOCATES]);
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
