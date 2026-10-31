import { AnimatePresence, motion } from "motion/react";
import { stanceMeta, type Advocate, type Case } from "../lib/types";

export const AGENT_LOOK: Record<Advocate, { name: string; plate: string; phosphor: string; glow: string; purpose: string }> = {
  prosecutor: { name: "The Prosecutor", plate: "PROSECUTION", phosphor: "#e6a95c", glow: "rgba(230,150,80,.35)", purpose: "Tests the claim for contradictions" },
  defender: { name: "The Defender", plate: "DEFENCE", phosphor: "#b5c48f", glow: "rgba(160,180,110,.30)", purpose: "Builds the strongest honest defence" },
  investigator: { name: "The Investigator", plate: "INVESTIGATION", phosphor: "#dcd5c2", glow: "rgba(220,210,190,.28)", purpose: "Follows only the primary record" },
};

type Geometry = { desk: string; monitor: { x: number; y: number; w: number; h: number }; lamp: { x: number; y: number; s: number }; tray: { x: number; y: number; s: number }; plate: { x: number; y: number; s: number } };

export const DESKS: Record<Advocate, Geometry> = {
  // foreground left, cropped by the frame: closest, largest, darkest
  prosecutor: { desk: "polygon(-80px 760px, 420px 760px, 452px 812px, -80px 812px)", monitor: { x: 116, y: 596, w: 230, h: 150 }, lamp: { x: 30, y: 682, s: 1.2 }, tray: { x: 300, y: 786, s: 1.1 }, plate: { x: 150, y: 772, s: 1.15 } },
  // foreground right, mirrored
  defender: { desk: "polygon(1180px 760px, 1680px 760px, 1680px 812px, 1148px 812px)", monitor: { x: 1254, y: 596, w: 230, h: 150 }, lamp: { x: 1514, y: 682, s: 1.2 }, tray: { x: 1196, y: 786, s: 1.1 }, plate: { x: 1300, y: 772, s: 1.15 } },
  // mid-ground left, in front of the archive: further away, smaller
  investigator: { desk: "polygon(206px 556px, 440px 556px, 452px 604px, 196px 604px)", monitor: { x: 262, y: 468, w: 128, h: 86 }, lamp: { x: 216, y: 520, s: 0.62 }, tray: { x: 214, y: 560, s: 0.6 }, plate: { x: 300, y: 574, s: 0.55 } },
};

/** One agent's physical workstation. Every visible state is driven by the case. */
export function Workstation({ role, c, onOpen, active }: { role: Advocate; c: Case | null; onOpen: () => void; active: boolean }) {
  const look = AGENT_LOOK[role], g = DESKS[role];
  const busy = !!c?.busy[role];
  const lines = (c?.activity ?? []).filter((a) => a.role === role && a.kind !== "thinking").slice(-6);
  const filing = c?.filings.filter((f) => f.role === role).at(-1);
  const prevFiling = c?.filings.filter((f) => f.role === role).at(-2);
  const sheets = c?.evidence.filter((e) => e.citedBy === role).length ?? 0;
  const m = g.monitor;
  const fs = m.w / 240; // font scale relative to the near monitors

  return (
    <div className="station absolute inset-0" data-active={active || undefined} style={{ pointerEvents: "none" }}>
      {/* desk surface */}
      <div className="absolute mat-oak" style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: g.desk, filter: role === "investigator" ? "brightness(.92)" : "brightness(.88) saturate(1.05)" }} aria-hidden>
        <div className="absolute inset-0" style={{ background: busy ? `radial-gradient(14% 10% at ${g.lamp.x / 16}% ${(g.lamp.y + 110 * g.lamp.s) / 9}%, rgba(255,214,150,.38), transparent)` : "none", transition: "background .8s" }} />
      </div>

      {/* desk front: thickness, and the cabinet below falling into shadow */}
      {role !== "investigator" && (
        <div className="absolute mat-oak" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: role === "prosecutor" ? "polygon(-80px 812px, 452px 812px, 452px 830px, 440px 900px, -80px 900px)" : "polygon(1148px 812px, 1680px 812px, 1680px 900px, 1160px 900px, 1148px 830px)", filter: "brightness(.62)" }} />
      )}
      {role !== "investigator" && <div className="absolute" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: role === "prosecutor" ? "polygon(-80px 811px, 452px 811px, 452px 813px, -80px 813px)" : "polygon(1148px 811px, 1680px 811px, 1680px 813px, 1148px 813px)", background: "rgba(255,214,160,.3)" }} />}
      {/* paper tray: one sheet per verified exhibit this agent entered */}
      <div className="absolute" style={{ left: g.tray.x, top: g.tray.y, transform: `scale(${g.tray.s})`, transformOrigin: "0 0" }} aria-hidden>
        {/* a wire in-tray, so the sheets sit in something */}
        <div className="absolute" style={{ left: -6, top: 8, width: 78, height: 30, transform: "skewX(-18deg)", border: "2px solid #4a4a46", borderTop: "none", background: "rgba(40,40,36,.12)" }} />
        {Array.from({ length: Math.min(sheets, 8) }, (_, i) => (
          <motion.div key={i} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute" style={{ left: (i % 2) * 2, top: 10 - i * 2.2, width: 64, height: 26, transform: `skewX(-18deg) rotate(${(i % 3) - 1}deg)`, background: "#f4ecd8", boxShadow: "0 1px 1px rgba(60,40,20,.3)", borderBottom: "1px solid #d8ccb0" }} />
        ))}
      </div>

      {/* banker's lamp: lit while this agent's Mozaik loop is running */}
      <div className="absolute" style={{ left: g.lamp.x, top: g.lamp.y, transform: `scale(${g.lamp.s})`, transformOrigin: "50% 100%" }} aria-hidden>
        {busy && <div className="absolute lamp-on" style={{ left: -70, top: 18, width: 180, height: 120, background: "radial-gradient(50% 60% at 50% 20%, rgba(255,214,150,.45), transparent 70%)", mixBlendMode: "screen" }} />}
        <div style={{ width: 46, height: 18, borderRadius: "22px 22px 3px 3px", background: busy ? "linear-gradient(180deg,#4f6b45,#2a3a26)" : "linear-gradient(180deg,#34402f,#1f271c)", boxShadow: busy ? "0 6px 16px rgba(255,220,150,.35)" : "none", transition: "all .6s" }} />
        <div className="mx-auto" style={{ width: 3, height: 34, background: "#8c6b43" }} />
        <div className="mx-auto" style={{ width: 30, height: 6, borderRadius: 3, background: "#6d5236" }} />
      </div>

      {/* nameplate */}
      <div className="absolute typed" style={{ left: g.plate.x, top: g.plate.y, transform: `scale(${g.plate.s})`, transformOrigin: "0 0", padding: "3px 8px", fontSize: 9, letterSpacing: ".12em", color: "#2a1d10", background: "linear-gradient(180deg,#c9a46a,#8c6b43)", boxShadow: "0 2px 3px rgba(0,0,0,.6)" }} aria-hidden>
        {look.plate}
      </div>

      {/* the monitor is the hotspot */}
      <button onClick={onOpen} aria-label={`${look.name}: open their file${busy ? " (working now)" : ""}`} className="group absolute text-left" style={{ left: m.x, top: m.y, width: m.w, height: m.h, pointerEvents: "auto" }}>
        <div className="absolute inset-0 rounded-[6px]" style={{ background: "linear-gradient(160deg,#3a3732,#1c1a17)", boxShadow: "0 10px 24px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)" }} />
        <div className="absolute overflow-hidden rounded-[3px] screen-scan" style={{ inset: 7 * fs, background: busy ? "#16140f" : "#100f0c", boxShadow: busy ? `0 0 ${30 * fs}px ${look.glow}, inset 0 0 ${24 * fs}px rgba(0,0,0,.8)` : "inset 0 0 20px rgba(0,0,0,.9)", transition: "box-shadow .8s" }}>
          <div className="typed absolute inset-0 overflow-hidden" style={{ padding: 6 * fs, fontSize: 8.5 * fs, lineHeight: 1.35, color: look.phosphor, opacity: busy ? 1 : 0.62 }}>
            <div className="flex justify-between" style={{ opacity: 0.8 }}>
              <span>{look.plate}</span>
              <span>{busy ? "● WORKING" : filing ? `R${filing.round} FILED` : c ? "STANDBY" : "NO CASE"}</span>
            </div>
            <div style={{ marginTop: 3 * fs, borderTop: `1px solid ${look.phosphor}33` }} />
            {filing && !busy ? (
              <div style={{ marginTop: 4 * fs }}>
                <div style={{ fontSize: 13 * fs, fontWeight: 500 }}>{filing.timedOut ? "NO FILING" : stanceMeta(filing.stance).label.toUpperCase()}</div>
                <div>{filing.confidence}% · {c?.evidence.filter((e) => e.citedBy === role).length} exhibits</div>
                {filing.changed && prevFiling && <div style={{ color: "#f0c78a" }}>REVISED from {stanceMeta(prevFiling.stance).label.toLowerCase()}</div>}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <motion.div key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="truncate">{"> "}{l.text}</motion.div>
                ))}
                {busy && <div key="caret" className="caret" />}
                {!c && <div key="idle" style={{ marginTop: 4 * fs }}>{look.purpose}</div>}
              </AnimatePresence>
            )}
          </div>
        </div>
        {/* monitor stand */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: m.h, width: m.w * 0.12, height: m.h * 0.14, background: "#2a2723" }} />
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: m.h * 1.13, width: m.w * 0.4, height: m.h * 0.05, background: "#24221f", borderRadius: 3 }} />
        <span className="hint absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-paper opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" style={{ top: -22, background: "rgba(20,15,10,.8)", fontSize: 11 * Math.max(fs, 0.7) }}>
          Read {look.name.toLowerCase()}’s file
        </span>
      </button>
    </div>
  );
}
