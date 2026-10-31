import { AnimatePresence, motion } from "motion/react";
import { Crosshair, Shield, ScanSearch, Search, FileText, Quote, Gavel } from "lucide-react";
import { ROLE_META, STANCE_META, type Advocate, type Case } from "../lib/types";

export const ROLE_ICON = { prosecutor: Crosshair, defender: Shield, investigator: ScanSearch, judge: Gavel };

function statusLine(c: Case, role: Advocate) {
  const last = [...c.activity].reverse().find((a) => a.role === role && (a.kind === "tool" || a.kind === "thinking"));
  if (!c.busy[role]) return null;
  return last?.text ?? "Opening the file…";
}

export function AgentColumn({ c, role, onEvidence }: { c: Case; role: Advocate; onEvidence: (id: string) => void }) {
  const meta = ROLE_META[role];
  const Icon = ROLE_ICON[role];
  const filings = c.filings.filter((f) => f.role === role);
  const latest = filings.at(-1);
  const busy = !!c.busy[role];
  const status = statusLine(c, role);
  const trail = c.activity.filter((a) => a.role === role && a.kind === "tool").slice(-5);
  const cited = c.evidence.filter((e) => e.citedBy === role);

  return (
    <section aria-label={meta.name} className="relative flex min-h-[460px] flex-col border-t-2 pt-4" style={{ borderColor: meta.color }}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker" style={{ color: meta.color }}>{meta.short}</p>
          <h3 className="display mt-1 text-[28px] font-[500] leading-none">{meta.name}</h3>
          <p className="mt-1 text-[13px] text-mute">{meta.brief}</p>
        </div>
        <div className="relative mt-1 grid size-10 place-items-center border border-rule" aria-hidden>
          <Icon size={18} style={{ color: meta.color }} />
          {busy && <motion.span className="absolute inset-0 border" style={{ borderColor: meta.color }} animate={{ opacity: [0.9, 0], scale: [1, 1.5] }} transition={{ duration: 1.6, repeat: Infinity }} />}
        </div>
      </header>

      {/* live status — what this agent's Mozaik loop is doing right now */}
      <div className="mt-4 h-6 font-mono text-[12px]" aria-live="polite">
        <AnimatePresence mode="wait">
          {status ? (
            <motion.p key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2 truncate text-ivory-dim">
              <span className="inline-block size-1.5 shrink-0 rounded-full animate-pulse" style={{ background: meta.color }} />
              {status}
            </motion.p>
          ) : (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-mute">{latest ? "Position on file" : "Awaiting summons"}</motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* stance gauge */}
      <div className="mt-3 border-y border-rule py-4">
        <AnimatePresence mode="wait">
          {latest ? (
            <motion.div key={`${latest.round}-${latest.stance}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-baseline justify-between">
                <span className="display text-[24px] italic" style={{ color: STANCE_META[latest.stance].color }}>{latest.timedOut ? "No filing" : STANCE_META[latest.stance].label}</span>
                <span className="font-mono text-[12px] text-mute">R{latest.round} · {latest.confidence}%</span>
              </div>
              <div className="mt-2 h-[3px] bg-rule"><motion.div className="h-full" style={{ background: STANCE_META[latest.stance].color }} initial={{ width: 0 }} animate={{ width: `${latest.confidence}%` }} transition={{ duration: 0.9, ease: "easeOut" }} /></div>
            </motion.div>
          ) : (
            <div className="space-y-2" aria-label="No position yet">
              <div className="h-6 w-2/3 bg-char-2 animate-pulse" />
              <div className="h-[3px] bg-rule" />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* the overturn moment */}
      <AnimatePresence>
        {latest?.changed && filings.length > 1 && (
          <motion.div initial={{ opacity: 0, scale: 1.3, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: -1.5 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="mt-4 border-2 border-gold p-3">
            <p className="kicker text-gold">Position revised · was {STANCE_META[filings.at(-2)!.stance].label.toLowerCase()} {filings.at(-2)!.confidence}%</p>
            {latest.whatChanged && <p className="mt-1 text-[13px] leading-snug text-ivory">{latest.whatChanged}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {latest && !latest.timedOut && <p className="mt-4 text-[14.5px] leading-relaxed text-ivory-dim">{latest.argument}</p>}

      {/* evidence trail */}
      <div className="mt-auto pt-5">
        <p className="kicker text-mute">Trail</p>
        <ul className="mt-2 space-y-1.5 font-mono text-[11.5px] text-mute">
          <AnimatePresence initial={false}>
            {trail.map((a) => (
              <motion.li key={a.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 truncate">
                {a.text.startsWith("Search") ? <Search size={12} className="mt-0.5 shrink-0" /> : a.text.startsWith("Read") ? <FileText size={12} className="mt-0.5 shrink-0" /> : <Quote size={12} className="mt-0.5 shrink-0" />}
                <span className="truncate">{a.text}</span>
              </motion.li>
            ))}
          </AnimatePresence>
          {!trail.length && <li>—</li>}
        </ul>
        {cited.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cited.map((e) => (
              <motion.button key={e.id} initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => onEvidence(e.id)}
                className="border border-rule px-1.5 py-0.5 font-mono text-[11px] hover:border-ivory" title={e.title}>{e.id}</motion.button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
