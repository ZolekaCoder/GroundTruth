import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Loader2, Megaphone } from "lucide-react";
import { STANCE_META, type Case, type Verdict as V } from "../lib/types";
import { EvidenceCard } from "./Ledger";

export function VerdictReveal({ c, v, previous }: { c: Case; v: V; previous?: V }) {
  const meta = STANCE_META[v.verdict];
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const lines = [
      `THE GROUND TRUTH — VERDICT: ${meta.label.toUpperCase()} (${v.confidence}% confidence)`,
      `Claim: “${c.claim}”`, "", v.headline, v.summary, "",
      "Key evidence:", ...v.keyEvidenceIds.map((id) => { const e = c.evidence.find((x) => x.id === id); return e ? `• “${e.quote}” — ${e.publisher}, ${e.url}` : ""; }).filter(Boolean),
      v.uncertainties.length ? `\nStill uncertain: ${v.uncertainties.join("; ")}` : "",
      v.framingNotes?.length ? `Framing issues: ${v.framingNotes.join("; ")}` : "",
      `\n${location.href}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.section aria-label="Verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative border-y-[3px] border-double border-ivory/70 bg-ivory text-ink">
      <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/30 pb-2">
          <span className="kicker">The Ground Truth · Ruling of the court{v.round > 2 ? ` · after objection` : ""}</span>
          <span className="kicker">{new Date(v.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
          <motion.div initial={{ scale: 2.2, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 14 }}
            className="justify-self-start border-[4px] px-5 py-3" style={{ borderColor: meta.color === "var(--color-mute)" ? "#5b564c" : meta.color, color: meta.color === "var(--color-mute)" ? "#5b564c" : meta.color }}>
            <p className="display text-[clamp(34px,5vw,60px)] font-[800] uppercase leading-none tracking-tight">{meta.label}</p>
            <p className="mt-1 font-mono text-[12px] uppercase tracking-widest">{v.confidence}% confidence</p>
          </motion.div>
          <div>
            {previous && previous.verdict !== v.verdict && (
              <p className="kicker mb-3 text-red">Overturned · previously {STANCE_META[previous.verdict].label} ({previous.confidence}%)</p>
            )}
            {previous && previous.verdict === v.verdict && (
              <p className="kicker mb-3 text-[#5b564c]">Upheld on objection · confidence {previous.confidence}% → {v.confidence}%</p>
            )}
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="display text-[clamp(32px,4.6vw,60px)] font-[600] leading-[1]">{v.headline}</motion.h2>
            <p className="display mt-4 text-[20px] italic leading-snug text-[#3d3a33]">{v.summary}</p>
          </div>
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="kicker">How the evidence was weighed</p>
            <p className="dropcap mt-3 text-[15.5px] leading-relaxed [&::first-letter]:text-red">{v.reasoning}</p>
            {v.uncertainties.length > 0 && (
              <>
                <p className="kicker mt-6">What remains uncertain</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px]">{v.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>
              </>
            )}
            {(v.framingNotes?.length ?? 0) > 0 && (
              <div className="mt-6 border-l-2 border-[#8a6a2e] pl-4">
                <p className="kicker">Framing, not fact</p>
                <p className="mt-1 text-[12.5px] text-[#5b564c]">How the claim is selected, emphasised or worded, kept apart from whether its words are accurate.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px]">{v.framingNotes!.map((u) => <li key={u}>{u}</li>)}</ul>
              </div>
            )}
            <p className="mt-6 text-[12.5px] text-[#5b564c]">{STANCE_META[v.verdict].gloss} This ruling rests on the cited exhibits, not on agreement between agents.</p>
          </div>
          <div className="space-y-3 [&_article]:bg-[#e3dbc8] [&_article_*]:!text-ink">
            <p className="kicker">Exhibits relied on</p>
            {v.keyEvidenceIds.map((id) => c.evidence.find((e) => e.id === id)).filter(Boolean).map((e) => <EvidenceCard key={e!.id} e={e!} c={c} />)}
            {!v.keyEvidenceIds.length && <p className="text-[14px]">The court cited no exhibit — treat this ruling as unsupported.</p>}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/30 pt-5">
          <button onClick={share} className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-[14px] text-ivory hover:bg-red">
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Summary copied" : "Copy shareable summary"}
          </button>
        </div>
      </div>
    </motion.section>
  );
}

export function ObjectionForm({ onSubmit, disabled }: { onSubmit: (arg: string, url?: string) => Promise<void>; disabled?: boolean }) {
  const [arg, setArg] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="border-t-2 border-red pt-4" onSubmit={async (e) => {
      e.preventDefault(); if (!arg.trim()) return;
      setBusy(true); setErr(null);
      try { await onSubmit(arg.trim(), url.trim() || undefined); setArg(""); setUrl(""); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
    }}>
      <h2 className="display text-[40px] font-[700] italic leading-none text-red">Objection!</h2>
      <p className="mt-2 max-w-[60ch] text-[14px] text-ivory-dim">Disagree with the ruling? State your counter-argument and, ideally, attach a source. The advocates will reconsider on the record, and you will see whose position moves and why.</p>
      <textarea value={arg} onChange={(e) => setArg(e.target.value)} rows={3} maxLength={1000} disabled={disabled} aria-label="Your objection"
        placeholder="e.g. Astronauts have reported seeing it from low Earth orbit…" className="mt-4 w-full resize-none border border-rule bg-char p-3 text-[15px] focus:border-red focus:outline-none" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" disabled={disabled} aria-label="Supporting source URL" placeholder="Supporting source URL (optional)"
        className="mt-2 w-full border border-rule bg-char p-3 font-mono text-[13px] focus:border-red focus:outline-none" />
      <button disabled={busy || disabled || !arg.trim()} className="mt-3 inline-flex items-center gap-2 bg-red px-5 py-3 font-semibold text-ivory hover:bg-[#d44a3f] disabled:opacity-40">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} Raise objection
      </button>
      {disabled && <p className="mt-2 text-[12.5px] text-mute">Objections are unavailable in the recorded case: they need the live court.</p>}
      {err && <p role="alert" className="mt-2 text-[13px] text-red">{err}</p>}
    </form>
  );
}
