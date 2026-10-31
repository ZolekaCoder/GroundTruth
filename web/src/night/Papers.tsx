import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, ExternalLink, FlaskConical, Loader2, X } from "lucide-react";
import { DOSSIERS, relativeDay, type Dossier } from "../lib/elections";
import { stanceMeta, type Advocate, type Case } from "../lib/types";
import { AGENT_LOOK } from "./Workstation";

const fmt = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** A sheet of paper sliding onto the desk in front of the camera. */
export function Sheet({ children, onClose, width = 640, tilt = -0.8, label }: { children: React.ReactNode; onClose: () => void; width?: number; tilt?: number; label: string }) {
  return (
    <motion.section role="dialog" aria-label={label}
      initial={{ y: 80, rotate: tilt * 4, opacity: 0 }} animate={{ y: 0, rotate: tilt, opacity: 1 }} exit={{ y: 60, rotate: tilt * 3, opacity: 0 }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
      className="mat-paper pointer-events-auto relative max-h-[calc(100vh-120px)] overflow-y-auto"
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}>
      <button onClick={onClose} className="absolute right-3 top-3 z-10 p-1 text-[#6b5a3c] hover:text-[#2b241c]" aria-label="Put the document down"><X size={18} /></button>
      {children}
    </motion.section>
  );
}

const Label = ({ children, tone = "#6b5a3c" }: { children: React.ReactNode; tone?: string }) => <p className="typed text-[11px] tracking-[.06em]" style={{ color: tone }}>{children}</p>;

export function DossierFolder({ id, onOpenCase, onDemo, onClose, busy, live, error }: {
  id: Dossier["id"]; onOpenCase: (input: { claim: string; url?: string }) => void; onDemo: () => void; onClose: () => void; busy: boolean; live: boolean | null; error: string | null;
}) {
  const d = DOSSIERS.find((x) => x.id === id)!;
  return (
    <Sheet onClose={onClose} width={860} label={`${d.country} election dossier`} tilt={-0.5}>
      <div className="grid md:grid-cols-2">
        <div className="border-b border-[#8a7a5c]/40 p-7 md:border-b-0 md:border-r">
          <Label>ELECTION DOSSIER · {relativeDay(d.date).toUpperCase()}</Label>
          <h2 className="mt-2 font-serif text-[40px] font-semibold leading-none">{d.country}</h2>
          <p className="typed mt-2 text-[12.5px]">{d.election} · {fmt(d.date)}</p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[#3d3222]">{d.standfirst}</p>
          <Label tone="#3d3222"><span className="mt-6 block border-b border-[#8a7a5c]/50 pb-1">VERIFIED CONTEXT, QUOTED FROM THE RECORD</span></Label>
          <ul className="mt-2 space-y-3">
            {d.context.map((c) => (
              <li key={c.quote}>
                <blockquote className="font-serif text-[15px] leading-snug">“{c.quote}”</blockquote>
                <a href={c.url} target="_blank" rel="noreferrer" className="typed mt-1 inline-flex items-center gap-1 text-[11px] text-[#6b5a3c] underline-offset-2 hover:underline">{c.publisher} · {c.date} <ExternalLink size={10} /></a>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-7">
          <div className="relative bg-[#f3ead3] p-5" style={{ boxShadow: "0 3px 8px rgba(40,25,10,.25)", transform: "rotate(.8deg)" }}>
            <p className="typed inline-flex items-center gap-1.5 text-[11px] text-[#8a5a1e]"><FlaskConical size={12} /> SYNTHETIC TEST CLAIM</p>
            <p className="mt-2 font-serif text-[21px] font-medium leading-snug">“{d.testClaim.text}”</p>
            <p className="mt-3 text-[12.5px] leading-snug text-[#5a4a32]">Written by The Ground Truth to test the court. Not a quotation from, or attribution to, any person, party or outlet. {d.testClaim.why}</p>
            <p className="typed mt-3 text-[11px] text-[#6b5a3c]">Checked against: {new URL(d.testClaim.url).hostname}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button disabled={busy || live === false} onClick={() => onOpenCase({ claim: d.testClaim.text, url: d.testClaim.url })}
              className="inline-flex items-center gap-2 bg-[#2b241c] px-5 py-3 text-[14px] font-semibold text-paper transition hover:bg-[#a3302a] disabled:opacity-40">
              {busy && <Loader2 size={15} className="animate-spin" />} Put it on trial
            </button>
            {d.id === "rs" && <button onClick={onDemo} className="text-[14px] text-[#3d3222] underline underline-offset-4 hover:text-[#a3302a]">Replay the recorded investigation</button>}
          </div>
          {live === false && <p className="mt-3 text-[12.5px] text-[#8a5a1e]">The live court is offline. The recorded investigation still plays.</p>}
          {error && <p role="alert" className="mt-3 text-[13px] text-[#a3302a]">{error}</p>}
          <Label tone="#3d3222"><span className="mt-8 block border-b border-[#8a7a5c]/50 pb-1">PRIMARY SOURCES</span></Label>
          <ul className="mt-2 space-y-1.5 text-[14px]">
            {d.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">{s.label} <span className="typed text-[11px] text-[#6b5a3c]">{s.publisher}</span> <ExternalLink size={11} /></a></li>)}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}

/** The case sheet: a typed intake form on paper, for any claim. */
export function CaseSheet({ c, onOpenCase, onClose, busy, live, error }: { c: Case | null; onOpenCase: (input: { claim?: string; url?: string }) => void; onClose: () => void; busy: boolean; live: boolean | null; error: string | null }) {
  const [claim, setClaim] = useState("");
  const [url, setUrl] = useState("");
  if (c) {
    const article = c.sources.find((s) => s.id === c.articleSourceId);
    return (
      <Sheet onClose={onClose} label="Case file" width={620}>
        <div className="p-8">
          <Label>CASE {c.id.slice(0, 8).toUpperCase()} · OPENED {new Date(c.openedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</Label>
          <p className="mt-4 font-serif text-[26px] font-medium leading-snug">“{c.claim}”</p>
          {article && <p className="typed mt-3 text-[12px]">Checked against: <a className="underline" href={article.url} target="_blank" rel="noreferrer">{article.title}</a> ({article.publisher})</p>}
          <dl className="typed mt-6 grid grid-cols-3 gap-4 border-t border-[#8a7a5c]/40 pt-4 text-[12px]">
            <div><dt className="text-[#6b5a3c]">Phase</dt><dd className="mt-1 text-[14px]">{c.phase.replace("_", "-")}</dd></div>
            <div><dt className="text-[#6b5a3c]">Exhibits</dt><dd className="mt-1 text-[14px]">{c.evidence.length} verified</dd></div>
            <div><dt className="text-[#6b5a3c]">Sources</dt><dd className="mt-1 text-[14px]">{c.sources.length} opened</dd></div>
          </dl>
          {c.error && <p role="alert" className="mt-4 text-[13px] text-[#a3302a]">{c.error}</p>}
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet onClose={onClose} label="New case" width={620} tilt={0.6}>
      <form className="p-8" onSubmit={(e) => { e.preventDefault(); if (claim.trim() || url.trim()) onOpenCase({ claim: claim.trim() || undefined, url: url.trim() || undefined }); }}>
        <Label>NEW CASE · INTAKE SHEET</Label>
        <label htmlFor="claim" className="typed mt-6 block text-[12px] text-[#6b5a3c]">Claim to be examined</label>
        <textarea id="claim" value={claim} onChange={(e) => setClaim(e.target.value)} rows={3} maxLength={600} placeholder="Type or paste the sentence…"
          className="mt-1 w-full resize-none border-0 border-b border-[#8a7a5c] bg-transparent font-serif text-[22px] leading-snug placeholder:text-[#a99a78] focus:border-[#2b241c] focus:outline-none"
          style={{ backgroundImage: "repeating-linear-gradient(transparent 0 33px, rgba(138,122,92,.35) 33px 34px)" }} />
        <label htmlFor="url" className="typed mt-5 block text-[12px] text-[#6b5a3c]">Where it appeared (optional URL)</label>
        <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://…" className="typed mt-1 w-full border-0 border-b border-[#8a7a5c] bg-transparent py-1 text-[14px] placeholder:text-[#a99a78] focus:border-[#2b241c] focus:outline-none" />
        <div className="mt-7 flex items-center gap-4">
          <button disabled={busy || live === false || (!claim.trim() && !url.trim())} className="inline-flex items-center gap-2 bg-[#2b241c] px-5 py-3 text-[14px] font-semibold text-paper hover:bg-[#a3302a] disabled:opacity-40">
            {busy && <Loader2 size={15} className="animate-spin" />} Put it on trial
          </button>
          <span className="text-[12.5px] text-[#6b5a3c]">Or pick an election from the map.</span>
        </div>
        {live === false && <p className="mt-3 text-[12.5px] text-[#8a5a1e]">The live court is offline.</p>}
        {error && <p role="alert" className="mt-3 text-[13px] text-[#a3302a]">{error}</p>}
      </form>
    </Sheet>
  );
}

/** An agent's file: their position, their reasoning (labelled as such), and what they entered. */
export function AgentFile({ role, c, onEvidence, onClose }: { role: Advocate; c: Case | null; onEvidence: (id: string) => void; onClose: () => void }) {
  const look = AGENT_LOOK[role];
  const filings = c?.filings.filter((f) => f.role === role) ?? [];
  const mine = c?.evidence.filter((e) => e.citedBy === role) ?? [];
  const against = c?.challenges.filter((x) => x.to === role) ?? [];
  const trail = c?.activity.filter((a) => a.role === role && a.kind === "tool").slice(-8) ?? [];
  return (
    <Sheet onClose={onClose} label={`${look.name}'s file`} width={640} tilt={role === "defender" ? 0.7 : -0.7}>
      <div className="border-t-[6px] p-7" style={{ borderColor: look.phosphor }}>
        <Label>{look.plate} · {c?.busy[role] ? "WORKING NOW" : filings.length ? "POSITION ON FILE" : "NO FILING YET"}</Label>
        <h2 className="mt-1 font-serif text-[30px] font-semibold">{look.name}</h2>
        <p className="typed text-[11px] text-[#6b5a3c]">AI agent (Mozaik) · illustrated as a reporter</p>
        <p className="text-[13.5px] text-[#5a4a32]">{look.purpose}</p>
        {!c && <p className="mt-6 text-[14px]">No case is open. Open one at the table and this desk will start working.</p>}
        {filings.map((f, i) => (
          <div key={f.round} className="mt-6 border-t border-[#8a7a5c]/40 pt-4">
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-[22px] font-semibold" style={{ color: f.stance === "contradicted" ? "#a3302a" : "#2b241c" }}>{f.timedOut ? "No filing before the deadline" : stanceMeta(f.stance).label}</p>
              <p className="typed text-[12px] text-[#6b5a3c]">Round {f.round} · {f.confidence}%</p>
            </div>
            {f.changed && i > 0 && (
              <p className="mt-2 inline-block border-2 border-[#8a5a1e] px-2 py-1 typed text-[11px] text-[#8a5a1e]" style={{ transform: "rotate(-1.5deg)" }}>
                REVISED · was {stanceMeta(filings[i - 1].stance).label.toLowerCase()} {filings[i - 1].confidence}%{f.whatChanged ? ` · ${f.whatChanged}` : ""}
              </p>
            )}
            {!f.timedOut && (
              <>
                <p className="typed mt-3 text-[10.5px] text-[#8a5a1e]">AGENT REASONING · NOT EVIDENCE</p>
                <p className="typed mt-1 text-[13px] leading-relaxed">{f.argument}</p>
              </>
            )}
          </div>
        ))}
        {against.length > 0 && (
          <div className="mt-6 border-t border-[#8a7a5c]/40 pt-4">
            <Label>CHALLENGED BY</Label>
            <ul className="mt-2 space-y-2 text-[13.5px]">{against.map((x) => <li key={x.id}><span className="typed text-[11px]" style={{ color: x.kind === "framing" ? "#8a5a1e" : "#a3302a" }}>{x.kind === "framing" ? "FRAMING" : "FACTUAL"} · {AGENT_LOOK[x.from].plate}</span><br />{x.point}</li>)}</ul>
          </div>
        )}
        {(c?.leads ?? []).filter((l) => l.assignee === role || l.by === role).length > 0 && (
          <div className="mt-6 border-t border-[#8a7a5c]/40 pt-4">
            <Label>LEADS</Label>
            <ul className="mt-2 space-y-2">{c!.leads.filter((l) => l.assignee === role || l.by === role).map((l) => (
              <li key={l.id} className="p-2" style={{ background: "#f6e7a6" }}>
                <p className="typed text-[10.5px] text-[#6b5a3c]">{l.id} · {l.by === role ? "raised" : "assigned"} · {l.status}</p>
                <p className="hand text-[19px] leading-[1.05]">{l.question}</p>
                {l.finding && <p className="typed mt-1 text-[12px]"><span className="text-[#8a5a1e]">FINDING (AGENT REASONING): </span>{l.finding}</p>}
              </li>))}
            </ul>
          </div>
        )}
        {mine.length > 0 && (
          <div className="mt-6 border-t border-[#8a7a5c]/40 pt-4">
            <Label>EXHIBITS THIS DESK ENTERED</Label>
            <div className="mt-2 flex flex-wrap gap-2">{mine.map((e) => <button key={e.id} onClick={() => onEvidence(e.id)} className="typed border border-[#8a7a5c] px-2 py-0.5 text-[12px] hover:bg-[#2b241c] hover:text-paper">{e.id}</button>)}</div>
          </div>
        )}
        {trail.length > 0 && (
          <div className="mt-6 border-t border-[#8a7a5c]/40 pt-4">
            <Label>RESEARCH TRAIL (MOZAIK TOOL CALLS)</Label>
            <ul className="typed mt-2 space-y-1 text-[12px] text-[#3d3222]">{trail.map((a) => <li key={a.id} className="truncate">› {a.text}</li>)}</ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}

const BEARING_TABLE = { supports: ["Supports the claim", "#4f5233"], undermines: ["Contradicts the claim", "#a3302a"], context: ["Context", "#7a5a2e"] } as const;
const BEARING_LABEL = new Proxy(BEARING_TABLE, { get: (t, k: string) => t[(k === "contradicts" ? "undermines" : k) as keyof typeof t] ?? t.context }) as typeof BEARING_TABLE;

export function EvidenceSheet({ id, c, onClose }: { id: string; c: Case; onClose: () => void }) {
  const e = c.evidence.find((x) => x.id === id);
  if (!e) return null;
  const s = c.sources.find((x) => x.id === e.sourceId);
  return (
    <Sheet onClose={onClose} label={`Exhibit ${e.id}`} width={600} tilt={0.9}>
      <div className="p-8">
        <div className="flex items-baseline justify-between"><Label>EXHIBIT {e.id} · VERIFIED QUOTATION</Label><span className="typed text-[11px]" style={{ color: BEARING_LABEL[e.bearing][1] }}>{BEARING_LABEL[e.bearing][0].toUpperCase()}</span></div>
        {s?.image && (
          <figure className="mt-4">
            <img src={s.image.url} alt={`Lead image from ${s.publisher}`} className="max-h-[220px] w-full object-cover" referrerPolicy="no-referrer" />
            <figcaption className="typed mt-1 text-[10.5px] text-[#6b5a3c]">{s.image.credit} · from the source’s own page</figcaption>
          </figure>
        )}
        <blockquote className="mt-4 font-serif text-[23px] leading-snug">“{e.quote}”</blockquote>
        <p className="mt-3 text-[12.5px] text-[#5a4a32]">The server matched this text word for word against the retrieved source before accepting it.</p>
        <dl className="typed mt-6 space-y-3 border-t border-[#8a7a5c]/40 pt-4 text-[12.5px]">
          <div><dt className="text-[#6b5a3c]">Origin</dt><dd><a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">{e.title} <ExternalLink size={11} /></a> · {e.publisher}</dd></div>
          <div><dt className="text-[#6b5a3c]">Dated</dt><dd>{s?.published ? `Source last updated ${s.published.slice(0, 10)}` : "The source carries no date"} · retrieved {s ? new Date(s.retrievedAt).toLocaleString("en-GB") : "—"}</dd></div>
          <div><dt className="text-[#6b5a3c]">Entered by</dt><dd>{AGENT_LOOK[e.citedBy as Advocate]?.name ?? e.citedBy}, round {e.round}</dd></div>
          <div><dt className="text-[#6b5a3c]">Why it matters (agent reasoning, not evidence)</dt><dd className="font-sans text-[14px]">{e.relevance}</dd></div>
        </dl>
      </div>
    </Sheet>
  );
}

export function SourceSheet({ id, c, onClose }: { id: string; c: Case; onClose: () => void }) {
  const s = c.sources.find((x) => x.id === id);
  if (!s) return null;
  const quoted = c.evidence.filter((e) => e.sourceId === id);
  return (
    <Sheet onClose={onClose} label={`Source ${s.id}`} width={560}>
      <div className="p-8">
        <Label>SOURCE {s.id} · {s.publisher}</Label>
        <h2 className="mt-2 font-serif text-[24px] font-semibold leading-tight">{s.title}</h2>
        <dl className="typed mt-4 space-y-2 text-[12.5px]">
          <div><dt className="inline text-[#6b5a3c]">Dated: </dt><dd className="inline">{s.published ? s.published.slice(0, 10) : "no date published"}</dd></div>
          <div><dt className="inline text-[#6b5a3c]">Retrieved: </dt><dd className="inline">{new Date(s.retrievedAt).toLocaleString("en-GB")}</dd></div>
          <div><dt className="inline text-[#6b5a3c]">Opened by: </dt><dd className="inline">{s.readBy.length ? s.readBy.join(", ") : "the clerk (attached article)"}</dd></div>
          <div><dt className="inline text-[#6b5a3c]">Quoted as: </dt><dd className="inline">{quoted.map((e) => e.id).join(", ") || "not quoted"}</dd></div>
        </dl>
        <a href={s.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[14px] underline">Open the original <ExternalLink size={12} /></a>
      </div>
    </Sheet>
  );
}

/** The ruling. The editor stamps it themselves; then it can be copied or reopened by objection. */
export function VerdictSheet({ c, live, onClose, onObjection }: { c: Case; live: boolean; onClose: () => void; onObjection: (arg: string, url?: string) => Promise<void> }) {
  const v = c.verdicts.at(-1)!;
  const prev = c.verdicts.at(-2);
  const [stamped, setStamped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [objecting, setObjecting] = useState(false);
  const [arg, setArg] = useState(""), [url, setUrl] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const color = v.verdict === "contradicted" ? "#a3302a" : v.verdict === "supported" ? "#4f5233" : v.verdict === "misleading" ? "#7a5a2e" : "#5b564c";
  const copy = async () => {
    const lines = [`THE GROUND TRUTH — RULING: ${stanceMeta(v.verdict).label.toUpperCase()} (${v.confidence}%)`, `Claim: “${c.claim}”`, "", v.headline, v.summary, "",
      ...v.keyEvidenceIds.map((id) => c.evidence.find((e) => e.id === id)).filter(Boolean).map((e) => `• “${e!.quote}” — ${e!.publisher}, ${e!.url}`),
      v.framingNotes?.length ? `\nFraming: ${v.framingNotes.join("; ")}` : "", v.uncertainties.length ? `Uncertain: ${v.uncertainties.join("; ")}` : ""];
    await navigator.clipboard.writeText(lines.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Sheet onClose={onClose} label="Ruling of the court" width={760} tilt={-0.4}>
      <div className="relative p-8 sm:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-double border-[#2b241c]/60 pb-2">
          <Label tone="#2b241c">THE GROUND TRUTH · RULING OF THE COURT</Label>
          <Label>CASE {c.id.slice(0, 8).toUpperCase()} · ROUND {v.round}</Label>
        </div>
        {prev && <p className="typed mt-3 text-[11.5px]" style={{ color: prev.verdict !== v.verdict ? "#a3302a" : "#6b5a3c" }}>{prev.verdict !== v.verdict ? `OVERTURNED ON OBJECTION · previously ${stanceMeta(prev.verdict).label}` : `UPHELD ON OBJECTION · ${prev.confidence}% → ${v.confidence}%`}</p>}
        <p className="mt-4 text-[13px] text-[#5a4a32]">On the claim “{c.claim}”</p>
        <h2 className="mt-2 font-serif text-[34px] font-semibold leading-[1.05]">{v.headline}</h2>
        <p className="mt-3 font-serif text-[18px] italic leading-snug text-[#3d3222]">{v.summary}</p>

        {/* the stamp */}
        <div className="mt-6 flex flex-wrap items-center gap-5">
          {stamped ? (
            <motion.div initial={{ scale: 2.4, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 0.92 }} transition={{ type: "spring", stiffness: 380, damping: 14 }}
              className="border-[4px] px-4 py-2" style={{ borderColor: color, color, mixBlendMode: "multiply" }}>
              <p className="font-serif text-[30px] font-extrabold uppercase leading-none">{stanceMeta(v.verdict).label}</p>
              <p className="typed text-[11px]">{v.confidence}% · {new Date().toLocaleDateString("en-GB")}</p>
            </motion.div>
          ) : (
            <button onClick={() => setStamped(true)} className="inline-flex items-center gap-2 border-2 border-dashed px-4 py-3 typed text-[13px] hover:bg-[#2b241c]/5" style={{ borderColor: color, color }}>
              Stamp the ruling: {stanceMeta(v.verdict).label} ({v.confidence}%)
            </button>
          )}
          <p className="max-w-[34ch] text-[12.5px] text-[#5a4a32]">{stanceMeta(v.verdict).gloss} The ruling rests on the cited exhibits, not on agreement between agents.</p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Label>HOW THE EVIDENCE WAS WEIGHED · JUDGE’S REASONING</Label>
            <p className="mt-2 text-[14.5px] leading-relaxed">{v.reasoning}</p>
            {(v.framingNotes?.length ?? 0) > 0 && (<>
              <Label><span className="mt-5 block">FRAMING, NOT FACT</span></Label>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px]">{v.framingNotes!.map((n) => <li key={n}>{n}</li>)}</ul>
            </>)}
            {v.uncertainties.length > 0 && (<>
              <Label><span className="mt-5 block">WHAT REMAINS UNCERTAIN</span></Label>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px]">{v.uncertainties.map((n) => <li key={n}>{n}</li>)}</ul>
            </>)}
          </div>
          <div>
            <Label>EXHIBITS RELIED ON</Label>
            <ul className="mt-2 space-y-3">
              {v.keyEvidenceIds.map((id) => c.evidence.find((e) => e.id === id)).filter(Boolean).map((e) => (
                <li key={e!.id} className="border-l-2 pl-3" style={{ borderColor: BEARING_LABEL[e!.bearing][1] }}>
                  <p className="typed text-[11px]">{e!.id} · {e!.publisher}</p>
                  <p className="font-serif text-[14px] leading-snug">“{e!.quote}”</p>
                </li>
              ))}
              {!v.keyEvidenceIds.length && <li className="text-[13px]">No exhibit cited: treat this ruling as unsupported.</li>}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#8a7a5c]/40 pt-5">
          <button onClick={copy} className="inline-flex items-center gap-2 bg-[#2b241c] px-4 py-2.5 text-[14px] text-paper hover:bg-[#4a3a28]">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Save summary to clipboard"}</button>
          <button onClick={() => setObjecting((o) => !o)} disabled={!live} className="px-4 py-2.5 text-[14px] text-[#a3302a] underline underline-offset-4 disabled:opacity-40">Reopen with an objection</button>
          {!live && <span className="self-center text-[12px] text-[#6b5a3c]">Objections need the live court; this is a recording.</span>}
        </div>

        {objecting && (
          <form className="mt-4 bg-[#f6f0dd] p-5" style={{ boxShadow: "0 3px 8px rgba(40,25,10,.2)", transform: "rotate(-.5deg)", backgroundImage: "repeating-linear-gradient(transparent 0 27px, rgba(80,110,160,.25) 27px 28px)" }}
            onSubmit={async (e) => { e.preventDefault(); if (!arg.trim()) return; setBusy(true); setErr(null); try { await onObjection(arg.trim(), url.trim() || undefined); onClose(); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } }}>
            <p className="typed text-[11px] text-[#a3302a]">OBJECTION · READER’S ARGUMENT (YOUR OPINION, NOT EVIDENCE UNTIL SOURCED)</p>
            <textarea value={arg} onChange={(e) => setArg(e.target.value)} rows={3} maxLength={1000} aria-label="Your objection" placeholder="State your counter-argument…" className="mt-2 w-full resize-none bg-transparent text-[16px] leading-[28px] focus:outline-none" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" aria-label="Supporting source URL" placeholder="Supporting source URL (optional)" className="typed w-full border-b border-[#8a7a5c] bg-transparent py-1 text-[13px] focus:outline-none" />
            <button disabled={busy || !arg.trim()} className="mt-3 inline-flex items-center gap-2 bg-[#a3302a] px-4 py-2 text-[14px] font-semibold text-paper disabled:opacity-40">{busy && <Loader2 size={14} className="animate-spin" />} File the objection</button>
            {err && <p role="alert" className="mt-2 text-[13px] text-[#a3302a]">{err}</p>}
          </form>
        )}
      </div>
    </Sheet>
  );
}

const DESKS: { role: Advocate; label: string }[] = [
  { role: "investigator", label: "Investigation" },
  { role: "prosecutor", label: "Prosecution" },
  { role: "defender", label: "Defence" },
];

/**
 * The editor's memo: the user's decision points. Live, every choice is real and steers the
 * Mozaik agents. In a recording, only the recorded path exists, so the memo shows what was
 * decided (and by whom) and offers to continue.
 */
export function EditorMemo({ c, live, onDecide, onContinue, onClose }: {
  c: Case; live: boolean; onDecide: (d: import("../lib/api").EditorDecision) => Promise<void>; onContinue?: () => void; onClose: () => void;
}) {
  const open = c.leads.filter((l) => l.status === "open");
  const [assign, setAssign] = useState<Record<string, Advocate | undefined>>({});
  const [own, setOwn] = useState(""), [ownTo, setOwnTo] = useState<Advocate>("investigator");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const afterInvestigation = c.pending === "after_investigation";
  const picks = [
    ...Object.entries(assign).filter(([, r]) => r).map(([leadId, r]) => ({ leadId, assignee: r! })),
    ...(own.trim().length >= 8 ? [{ question: own.trim(), assignee: ownTo }] : []),
  ];
  const run = async (d: import("../lib/api").EditorDecision) => { setBusy(true); setErr(null); try { await onDecide(d); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } };
  const chal = c.challenges.length, conceded = c.rebuttals.filter((r) => r.concede).length;
  const recorded = !live;
  // in a recording, the decision that followed this pause
  const pauseAt = c.phaseLog.filter((p) => p.phase === "awaiting_editor").at(-1)?.at ?? 0;

  return (
    <Sheet onClose={onClose} label="Editor's decision" width={720} tilt={0.5}>
      <div className="p-7">
        <p className="typed text-[13px] text-[#a3302a]">EDITOR’S DESK · DECISION {afterInvestigation ? "1 OF 2" : "2 OF 2"}</p>
        <h2 className="hand mt-1 text-[38px] leading-none text-[#2b241c]">Your call, editor.</h2>
        <p className="mt-2 max-w-[60ch] text-[15.5px] leading-snug text-[#3d3222]">
          {afterInvestigation
            ? `First reports are in: ${c.evidence.length} verified exhibits. The desks flagged ${open.length} lead${open.length === 1 ? "" : "s"}. Choose what to chase and who chases it: leads you assign to different desks are researched at the same time.`
            : `Cross-examination is done: ${chal} challenge${chal === 1 ? "" : "s"}, ${conceded} conceded. Send it to the judge, or send someone back out first.`}
        </p>

        {recorded && (
          <div className="mt-4 bg-white/60 p-4" style={{ boxShadow: "0 2px 6px rgba(60,40,20,.15)" }}>
            <p className="typed text-[12.5px] text-[#7a4e16]">RECORDED DECISION{c.autopilot ? " · TAKEN BY THE TEST AUTOPILOT, NOT A PERSON" : ""}</p>
            <p className="mt-1 text-[14.5px]">{c.decisions.find((d) => d.at >= pauseAt)?.detail ?? "Continue to see what was decided."}</p>
            <p className="mt-1 max-w-[68ch] text-[14px] text-[#4a3d2a]">A recording can only follow the path that was actually taken. Open a live case to make this call yourself.</p>
            <button onClick={onContinue} className="mt-3 bg-[#2b241c] px-5 py-2.5 text-[14px] font-semibold text-paper hover:bg-[#2f5f63]">Continue the recording</button>
          </div>
        )}

        {(afterInvestigation || open.length > 0) && (
          <ul className="mt-5 space-y-3">
            {open.map((l) => (
              <li key={l.id} className="p-3" style={{ background: "linear-gradient(#f6e7a6,#f1dd8c)", boxShadow: "0 3px 8px rgba(60,40,20,.2)" }}>
                <p className="typed text-[12.5px] text-[#5a4a32]">{l.id} · RAISED BY THE {l.by.toUpperCase()}</p>
                <p className="hand max-w-[52ch] text-[23px] leading-[1.25]">{l.question}</p>
                <p className="mt-1 line-clamp-2 max-w-[68ch] text-[14px] leading-snug text-[#4a3d2a]">{l.why}</p>
                {!recorded && <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="typed text-[12.5px] text-[#5a4a32]">Assign to</span>
                  {DESKS.map((d) => (
                    <button key={d.role} disabled={recorded} onClick={() => setAssign((a) => ({ ...a, [l.id]: a[l.id] === d.role ? undefined : d.role }))}
                      className={`rounded-full border px-3 py-1 text-[14px] ${assign[l.id] === d.role ? "border-[#2f5f63] bg-[#2f5f63] text-white" : "border-[#8a7a5c] hover:bg-white/50"}`}>{d.label}</button>
                  ))}
                </div>}
              </li>
            ))}
            {!recorded && (
              <li className="bg-white/50 p-3">
                <label className="typed text-[12.5px] text-[#5a4a32]" htmlFor="own-lead">OR WRITE YOUR OWN LEAD</label>
                <input id="own-lead" value={own} onChange={(e) => setOwn(e.target.value)} placeholder="e.g. What did the final ODIHR report conclude?" className="hand mt-1 w-full border-b border-[#8a7a5c] bg-transparent text-[22px] focus:outline-none" />
                <div className="mt-2 flex flex-wrap gap-1.5">{DESKS.map((d) => <button key={d.role} onClick={() => setOwnTo(d.role)} className={`rounded-full border px-2.5 py-0.5 text-[12.5px] ${ownTo === d.role ? "border-[#2f5f63] bg-[#2f5f63] text-white" : "border-[#8a7a5c]"}`}>{d.label}</button>)}</div>
              </li>
            )}
          </ul>
        )}

        {recorded ? null : (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#8a7a5c]/40 pt-4">
            <button disabled={busy || !picks.length || picks.length > 3} onClick={() => run({ action: "pursue", leads: picks })} className="inline-flex items-center gap-2 bg-[#2f5f63] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#244c50] disabled:opacity-40">
              {busy && <Loader2 size={14} className="animate-spin" />} {picks.length > 1 ? `Send out ${picks.length} leads (${new Set(picks.map((p) => p.assignee)).size} desks)` : "Send it out"}
            </button>
            {afterInvestigation
              ? <button disabled={busy} onClick={() => run({ action: "proceed" })} className="px-3 py-2.5 text-[14px] underline underline-offset-4">Skip to cross-examination</button>
              : <button disabled={busy} onClick={() => run({ action: "call_judge" })} className="bg-[#2b241c] px-5 py-2.5 text-[14px] font-semibold text-paper hover:bg-[#a3302a]">Send it to the judge</button>}
            {picks.length > 3 && <span className="text-[12.5px] text-[#a3302a]">At most three leads at once.</span>}
            {err && <p role="alert" className="w-full text-[13px] text-[#a3302a]">{err}</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
