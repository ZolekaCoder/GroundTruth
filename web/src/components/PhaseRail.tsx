import { motion } from "motion/react";
import type { Case } from "../lib/types";

const STEPS = [
  { key: "investigation", label: "Investigation" },
  { key: "cross_examination", label: "Cross-examination" },
  { key: "deliberation", label: "Deliberation" },
  { key: "verdict", label: "Verdict" },
] as const;

export function PhaseRail({ c }: { c: Case }) {
  const phase = c.phase === "objection" ? "cross_examination" : c.phase;
  const idx = STEPS.findIndex((s) => s.key === phase);
  return (
    <nav aria-label="Case progress" className="grid grid-cols-4 border-b border-rule">
      {STEPS.map((s, i) => (
        <div key={s.key} className="relative py-3 pr-2" aria-current={i === idx ? "step" : undefined}>
          <span className={`kicker ${i <= idx ? "text-ivory" : "text-mute"}`}>
            <span className="hidden sm:inline">{String(i + 1).padStart(2, "0")} </span>{s.label}{i === 1 && c.phase === "objection" ? " · Objection" : ""}
          </span>
          {i <= idx && <motion.div layoutId={i === idx ? "rail" : undefined} className="absolute bottom-[-1px] left-0 h-[2px] w-full" style={{ background: i === idx ? "var(--color-red)" : "var(--color-ivory-dim)" }} />}
        </div>
      ))}
    </nav>
  );
}
