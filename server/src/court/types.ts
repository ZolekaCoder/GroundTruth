export const ADVOCATES = ["prosecutor", "defender", "investigator"] as const;
export type Advocate = (typeof ADVOCATES)[number];
export type Role = Advocate | "judge";
export const ROLES: Role[] = [...ADVOCATES, "judge"];

export type Stance = "supported" | "contradicted" | "misleading" | "insufficient";
export type Phase = "opening" | "investigation" | "cross_examination" | "deliberation" | "verdict" | "objection" | "failed";
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
  id: string;
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
