export type Advocate = "prosecutor" | "defender" | "investigator";
export type Role = Advocate | "judge";
export type Stance = "supported" | "contradicted" | "misleading" | "insufficient";
export type Phase = "opening" | "investigation" | "cross_examination" | "deliberation" | "verdict" | "objection" | "failed";

export type Source = { id: string; url: string; title: string; publisher: string; retrievedAt: number; published?: string; readBy: Role[]; length: number };
export type Evidence = { id: string; sourceId: string; url: string; title: string; publisher: string; quote: string; bearing: "supports" | "undermines" | "context"; relevance: string; citedBy: Role; at: number; round: number };
export type Filing = { role: Advocate; round: number; stance: Stance; confidence: number; argument: string; evidenceIds: string[]; changed: boolean; whatChanged?: string; at: number; timedOut?: boolean };
export type Challenge = { id: string; from: Advocate; to: Advocate; kind?: "factual" | "framing"; point: string; evidenceIds: string[]; at: number };
export type Verdict = { round: number; verdict: Stance; confidence: number; headline: string; summary: string; reasoning: string; keyEvidenceIds: string[]; uncertainties: string[]; framingNotes?: string[]; at: number };
export type Activity = { id: string; role: Role | "clerk"; kind: "thinking" | "tool" | "said" | "error" | "phase"; text: string; at: number };
export type Objection = { round: number; argument: string; url?: string; at: number };

export type Case = {
  id: string; claim: string; articleUrl?: string; articleSourceId?: string; openedAt: number; phase: Phase; round: number;
  sources: Source[]; evidence: Evidence[]; filings: Filing[]; challenges: Challenge[]; verdicts: Verdict[]; objections: Objection[];
  activity: Activity[]; busy: Partial<Record<Role, number>>; turns: { role: Role; round: number; startedAt: number; endedAt?: number }[]; error?: string;
};

export const ADVOCATES: Advocate[] = ["prosecutor", "defender", "investigator"];

export const ROLE_META: Record<Role, { name: string; short: string; color: string; brief: string }> = {
  prosecutor: { name: "The Prosecutor", short: "Prosecution", color: "var(--color-red)", brief: "Tests every weakness" },
  defender: { name: "The Defender", short: "Defence", color: "var(--color-sage)", brief: "Builds the strongest honest case" },
  investigator: { name: "The Investigator", short: "Investigation", color: "var(--color-gold)", brief: "Follows only the primary record" },
  judge: { name: "The Judge", short: "Bench", color: "var(--color-ivory)", brief: "Weighs evidence, not consensus" },
};

export const STANCE_META: Record<Stance, { label: string; color: string; gloss: string }> = {
  supported: { label: "Supported", color: "var(--color-sage)", gloss: "Reliable evidence confirms the claim as stated." },
  contradicted: { label: "Contradicted", color: "var(--color-red)", gloss: "Reliable evidence shows the claim is false." },
  misleading: { label: "Misleading", color: "var(--color-gold)", gloss: "Partly true, but missing context distorts it." },
  insufficient: { label: "Insufficient evidence", color: "var(--color-mute)", gloss: "The available record cannot settle it." },
};

/** Tolerant lookup: an unexpected stance from the model must never crash the room. */
export const stanceMeta = (s: string) => STANCE_META[s as Stance] ?? STANCE_META.insufficient;
