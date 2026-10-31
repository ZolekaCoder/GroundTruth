import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Link2, PlayCircle, Loader2 } from "lucide-react";

// Calibration cases: deliberately non-political, well-documented claims for testing the court.
const DOCKET = [
  { claim: "The Great Wall of China is visible from space with the naked eye.", note: "A schoolbook favourite" },
  { claim: "Humans only use 10 percent of their brains.", note: "The neuroscience myth" },
  { claim: "Lightning never strikes the same place twice.", note: "Folk wisdom on trial" },
  { claim: "The 2004 Indian Ocean earthquake and tsunami killed more than 200,000 people.", note: "A hard number" },
];

export function Intake({ onOpen, onDemo, busy, error, live, offlineReason, draftUrl }: {
  onOpen: (input: { claim?: string; url?: string }) => void; onDemo: () => void; busy: boolean; error: string | null; live: boolean | null; offlineReason?: string | null;
  draftUrl?: { url: string; n: number } | null;
}) {
  const [claim, setClaim] = useState("");
  const [url, setUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const claimRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!draftUrl) return;
    setUrl(draftUrl.url); setShowUrl(true);
    claimRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => claimRef.current?.focus({ preventScroll: true }), 400);
  }, [draftUrl]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (claim.trim() || url.trim()) onOpen({ claim: claim.trim() || undefined, url: url.trim() || undefined }); };

  return (
    <main id="newsroom" className="mx-auto max-w-[1380px] px-4 sm:px-8 pb-24">
      <section className="mt-24 grid gap-10 border-t-[3px] border-double border-rule pt-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <p className="kicker text-red">The newsroom</p>
          <h2 className="display mt-3 text-[clamp(36px,5vw,68px)] font-[380] leading-[0.95]">
            Don’t just read the news. <em className="font-[300] text-gold">Cross-examine it.</em>
          </h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="dropcap mt-8 max-w-[58ch] text-[17px] leading-relaxed text-ivory-dim">
            Put any claim on trial. A prosecutor, a defender and an independent investigator work the case at the same time,
            each entering verbatim quotations into a shared ledger the server checks word for word. Then they cross-examine one another,
            and a judge rules on the evidence alone. Agreement between machines is not proof. Sources are.
          </motion.p>
        </div>

        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="self-end border-t-2 border-ivory pt-5">
          <label htmlFor="claim" className="kicker text-mute">The claim on trial</label>
          <textarea id="claim" ref={claimRef} value={claim} onChange={(e) => setClaim(e.target.value)} rows={4} maxLength={600}
            placeholder="Paste a sentence from a news story or campaign post…"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }}
            className="display mt-3 w-full resize-none bg-transparent text-[26px] leading-snug placeholder:text-rule focus:outline-none" />
          {showUrl ? (
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://… article the claim came from (optional)" aria-label="Article URL"
              className="mt-2 w-full border-b border-rule bg-transparent py-2 font-mono text-[13px] placeholder:text-mute focus:border-gold focus:outline-none" />
          ) : (
            <button type="button" onClick={() => setShowUrl(true)} className="mt-1 inline-flex items-center gap-2 kicker text-mute hover:text-ivory"><Link2 size={13} /> Attach the source article</button>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button disabled={busy || (!claim.trim() && !url.trim()) || live === false}
              className="group inline-flex items-center gap-3 bg-ivory px-6 py-3.5 text-ink font-semibold tracking-wide transition hover:bg-gold disabled:opacity-40 disabled:hover:bg-ivory">
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              Put it on trial <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={onDemo} className="inline-flex items-center gap-2 text-ivory-dim hover:text-ivory">
              <PlayCircle size={18} /> Watch the recorded Serbia case
            </button>
          </div>
          {live === false && <p role="status" className="mt-4 text-[13px] text-gold">The live court is offline. {offlineReason} Recorded cases still play.</p>}
          {error && <p role="alert" className="mt-4 text-[13px] text-red">{error}</p>}
        </motion.form>
      </section>

      <section className="mt-20">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="kicker text-ivory">Calibration docket</h2>
          <span className="kicker text-mute">Non-political, well-documented claims for testing the court</span>
        </div>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
          {DOCKET.map((d, i) => (
            <li key={d.claim} className="border-b border-rule sm:[&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0">
              <button onClick={() => setClaim(d.claim)} className="group h-full w-full p-5 text-left transition hover:bg-char">
                <span className="kicker text-mute">No. {String(i + 1).padStart(3, "0")} · {d.note}</span>
                <span className="display mt-3 block text-[20px] leading-snug group-hover:text-gold">“{d.claim}”</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 grid gap-8 sm:grid-cols-3 text-[14px] leading-relaxed text-ivory-dim">
        {[
          ["01 · Concurrent", "One summons, three Mozaik agents. Each reacts on its own loop; none waits for another."],
          ["02 · Verified", "Every quotation is matched against the retrieved source text. Paraphrases are rejected."],
          ["03 · Contestable", "Raise an objection. The advocates reconsider, and you see exactly what changed."],
        ].map(([k, v]) => (
          <div key={k} className="border-t border-rule pt-4"><p className="kicker text-gold">{k}</p><p className="mt-2">{v}</p></div>
        ))}
      </section>
    </main>
  );
}
