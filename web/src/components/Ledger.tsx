import { AnimatePresence, motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { ROLE_META, type Case, type Evidence } from "../lib/types";

export const BEARING = {
  supports: { label: "Supports", color: "var(--color-sage)" },
  undermines: { label: "Undermines", color: "var(--color-red)" },
  context: { label: "Context", color: "var(--color-gold)" },
} as const;

export function EvidenceCard({ e, c, highlight }: { e: Evidence; c: Case; highlight?: boolean }) {
  const src = c.sources.find((s) => s.id === e.sourceId);
  return (
    <motion.article id={`ev-${e.id}`} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className={`border-l-2 bg-char p-4 transition ${highlight ? "ring-1 ring-gold" : ""}`} style={{ borderColor: BEARING[e.bearing].color }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[12px] text-ivory">{e.id} <span style={{ color: BEARING[e.bearing].color }}>· {BEARING[e.bearing].label}</span></span>
        <span className="kicker" style={{ color: ROLE_META[e.citedBy].color }}>{ROLE_META[e.citedBy].short}</span>
      </div>
      <blockquote className="display mt-2 text-[17px] leading-snug">“{e.quote}”</blockquote>
      <p className="mt-2 text-[13px] text-ivory-dim">{e.relevance}</p>
      <a href={e.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11.5px] text-mute hover:text-gold">
        {e.publisher} · {e.title}{src?.published ? ` · updated ${src.published.slice(0, 10)}` : ""} <ExternalLink size={11} />
      </a>
    </motion.article>
  );
}

export function Ledger({ c, focus }: { c: Case; focus: string | null }) {
  return (
    <section aria-label="Evidence ledger">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <h2 className="kicker text-ivory">Shared evidence ledger</h2>
        <span className="kicker text-mute">{c.evidence.length} exhibits · {c.sources.length} sources · quotes verified verbatim</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {[...c.evidence].reverse().map((e) => <EvidenceCard key={e.id} e={e} c={c} highlight={focus === e.id} />)}
        </AnimatePresence>
        {!c.evidence.length && <p className="text-[14px] text-mute">No exhibits yet. Quotes appear here the moment an agent’s citation passes verification.</p>}
      </div>
    </section>
  );
}

export function Disagreements({ c }: { c: Case }) {
  if (!c.challenges.length) return null;
  return (
    <section aria-label="Cross-examination">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <h2 className="kicker text-ivory">Cross-examination</h2>
        <span className="kicker text-mute">{c.challenges.filter((x) => x.kind === "framing").length} framing · {c.challenges.filter((x) => x.kind !== "framing").length} factual</span>
      </div>
      <ul className="mt-3 divide-y divide-rule">
        <AnimatePresence initial={false}>
          {c.challenges.map((x) => (
            <motion.li key={x.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-[auto_1fr] gap-4 py-3">
              <div className="flex items-center gap-2 pt-1 kicker">
                <span style={{ color: ROLE_META[x.from].color }}>{ROLE_META[x.from].short}</span>
                <motion.span className="relative block h-px w-10 bg-ivory-dim" initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6 }}>
                  <span className="absolute -right-0.5 -top-[3px] border-y-[3.5px] border-l-[6px] border-y-transparent border-l-ivory-dim" />
                </motion.span>
                <span style={{ color: ROLE_META[x.to].color }}>{ROLE_META[x.to].short}</span>
              </div>
              <p className="text-[14.5px] leading-snug">
                <span className={`mr-2 inline-block border px-1.5 py-px align-[2px] font-mono text-[10px] uppercase tracking-widest ${x.kind === "framing" ? "border-gold text-gold" : "border-ivory-dim text-ivory-dim"}`}>
                  {x.kind === "framing" ? "Framing" : "Factual"}
                </span>
                {x.point} {x.evidenceIds.length > 0 && <span className="font-mono text-[11px] text-mute">[{x.evidenceIds.join(", ")}]</span>}</p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
