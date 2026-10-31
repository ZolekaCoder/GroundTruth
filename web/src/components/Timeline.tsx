import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ROLE_META, type Case, type Role } from "../lib/types";

const LANES: Role[] = ["prosecutor", "defender", "investigator", "judge"];

/** Wall-clock lanes drawn from real Mozaik turn timestamps. Overlapping bars are overlapping reality. */
export function Timeline({ c, live }: { c: Case; live: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!live) return; const iv = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(iv); }, [live]);
  const latestEvent = Math.max(c.openedAt + 1000, ...c.activity.map((a) => a.at), ...c.turns.map((t) => t.endedAt ?? t.startedAt));
  const end = live && c.phase !== "verdict" && c.phase !== "failed" ? Math.max(now, latestEvent) : latestEvent;
  const span = Math.max(20_000, end - c.openedAt);
  const x = (t: number) => `${((t - c.openedAt) / span) * 100}%`;
  const openNow = Object.keys(c.busy).length;
  const pts = c.turns.flatMap((t) => [[t.startedAt, 1], [t.endedAt ?? end, -1]] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let o = 0, peak = 0; for (const [, d] of pts) { o += d; peak = Math.max(peak, o); }
  const phaseMarks = c.activity.filter((a) => a.role === "clerk" && a.kind === "phase");

  return (
    <section aria-label="Investigation timeline" className="border border-rule bg-char p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="kicker text-ivory">Live investigation timeline</h2>
        <p className="font-mono text-[12px] text-mute">
          <span className="text-ivory">{openNow}</span> agents working now · peak <span className="text-gold">{peak}</span> concurrent · {((end - c.openedAt) / 1000).toFixed(0)}s
        </p>
      </div>
      <div className="relative mt-4 space-y-2">
        {phaseMarks.map((p) => (
          <div key={p.id} className="absolute inset-y-0 border-l border-dashed border-rule" style={{ left: x(p.at) }} title={p.text} aria-hidden />
        ))}
        {LANES.map((role) => (
          <div key={role} className="relative flex h-5 items-center">
            <span className="w-24 shrink-0 kicker text-mute">{ROLE_META[role].short}</span>
            <div className="relative h-full flex-1 border-b border-rule/60">
              {c.turns.filter((t) => t.role === role).map((t) => (
                <motion.div key={`${t.startedAt}`} className="absolute top-1 h-3" style={{ left: x(t.startedAt), width: `calc(${x(t.endedAt ?? end)} - ${x(t.startedAt)})`, background: ROLE_META[role].color, opacity: t.endedAt ? 0.55 : 1 }}
                  initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} />
              ))}
              {c.evidence.filter((e) => e.citedBy === role).map((e) => (
                <span key={e.id} className="absolute top-0 h-5 w-px bg-ivory" style={{ left: x(e.at) }} title={`${e.id} entered`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-mute">Bars are agent turns on their own Mozaik loops; ticks are evidence entered; dashed lines are phase changes.</p>
    </section>
  );
}
