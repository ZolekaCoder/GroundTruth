export const ADVOCATES = ["prosecutor", "defender", "investigator"] as const;
export type Advocate = (typeof ADVOCATES)[number];
export type Role = Advocate | "judge";
export const ROLES: Role[] = [...ADVOCATES, "judge"];

export type Stance = "supported" | "contradicted" | "misleading" | "insufficient";
export type Phase = "opening" | "investigation" | "awaiting_editor" | "leads" | "cross_examination" | "rebuttal" | "deliberation" | "verdict" | "objection" | "failed";
/** What a summoned agent must produce to finish the current stage. */
export type StageKind = "file" | "lead" | "rebut" | "verdict";
export type Bearing = "supports" | "undermines" | "context";

export type Source = {
  id: string; // S1, S2...
  url: string;
  title: string;
  publisher: string;
  retrievedAt: number;
  published?: string;
  text: string; // full extracted text — the grounding corpus for quotes
  readBy: Role[];
  image?: { url: string; credit: string }; // the source's own lead image (og:image / Wikipedia page image)
};

export type Evidence = {
  id: string; // E1, E2...
  sourceId: string;
  url: string;
  title: string;
  publisher: string;
  quote: string; // verified verbatim against Source.text
  bearing: Bearing;
  relevance: string;
  citedBy: Role;
  at: number;
  round: number;
};

export type Filing = {
  role: Advocate;
  round: number; // 1 = investigation, 2 = cross-examination, 3+ = objections
  stance: Stance;
  confidence: number;
  argument: string;
  evidenceIds: string[];
  changed: boolean;
  whatChanged?: string;
  at: number;
  timedOut?: boolean;
};

export type Challenge = {
  id: string; // C1, C2...
  round: number;
  from: Advocate;
  to: Advocate;
  kind: "factual" | "framing"; // disputing what is true vs. what was selected, emphasised or omitted
  point: string;
  evidenceIds: string[];
  at: number;
};

export type Verdict = {
  round: number;
  verdict: Stance;
  confidence: number;
  headline: string;
  summary: string;
  reasoning: string;
  keyEvidenceIds: string[];
  uncertainties: string[];
  framingNotes: string[]; // editorial framing problems, kept separate from factual findings
  at: number;
};

export type Activity = {
  id: string;
  role: Role | "clerk";
  kind: "thinking" | "tool" | "said" | "error" | "phase";
  text: string;
  at: number;
};

export type Objection = { round: number; argument: string; url?: string; at: number };

/** A question worth separate research, raised by an agent or by the editor (the user). */
export type Lead = {
  id: string; // L1, L2...
  by: Advocate | "editor";
  question: string;
  why: string;
  at: number;
  round: number;
  status: "open" | "assigned" | "reported" | "dropped";
  assignee?: Advocate;
  assignedAt?: number;
  finding?: string;
  evidenceIds?: string[];
  reportedAt?: number;
};

export type Rebuttal = { id: string; challengeId: string; by: Advocate; response: string; concede: boolean; at: number; timedOut?: boolean };

/** The editor's choices. User input — direction, never evidence. */
export type Decision = { at: number; action: "pursue" | "proceed" | "call_judge" | "objection"; detail: string };

export type Case = {
  id: string;
  claim: string;
  articleUrl?: string;
  articleSourceId?: string;
  openedAt: number;
  phase: Phase;
  round: number;
  sources: Source[];
  evidence: Evidence[];
  filings: Filing[];
  challenges: Challenge[];
  verdicts: Verdict[];
  objections: Objection[];
  activity: Activity[];
  leads: Lead[];
  rebuttals: Rebuttal[];
  decisions: Decision[];
  phaseLog: { phase: Phase; round: number; at: number }[];
  pending?: "after_investigation" | "before_verdict"; // which editor decision the court is waiting on
  afterLeads?: "cross_examination" | "before_verdict";
  stage?: { kind: StageKind; roles: Role[]; round: number };
  autopilot?: boolean; // headless scripts only: the clerk takes the editor's decisions itself
  agentIds: Partial<Record<Role, string>>;
  busy: Partial<Record<Role, number>>; // role -> turn start time, for concurrency proof
  turns: { role: Role; round: number; startedAt: number; endedAt?: number }[];
  error?: string;
};

/** What the browser receives: everything except the full source corpora. */
export function publicCase(c: Case) {
  return {
    ...c,
    sources: c.sources.map(({ text, ...rest }) => ({ ...rest, length: text.length })),
  };
}
