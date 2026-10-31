import { AnimatePresence, motion } from "motion/react";
import { stanceMeta, type Advocate, type Case, type Evidence, type Lead, type Source } from "../lib/types";
import { DOSSIERS } from "../lib/elections";
import { AGENT_LOOK } from "./Workstation";

const PANEL = { x: 360, y: 56, w: 580, h: 362 };
const CLAIM = { x: 196, y: 12, w: 188, h: 78 };
const CLIP = { w: 88, h: 80 };
const SLOTS: [number, number][] = [
  [12, 12], [104, 18], [396, 18], [488, 12],
  ...Array.from({ length: 6 }, (_, i) => [12 + i * 94, 116] as [number, number]),
];
const LEAD_SLOTS: [number, number][] = [[14, 214], [112, 220], [210, 212], [308, 218]];
const TAGS: Record<Advocate, number> = { prosecutor: 70, investigator: 245, defender: 420 };
const BEARING = {
  supports: { color: "#6d7046", label: "Supports" },
  undermines: { color: "#a3302a", label: "Contradicts" },
  context: { color: "#8c6b43", label: "Context" },
} as const;
// where each agent's desk is relative to the wall, so exhibits arrive from the right direction
const FROM: Record<Advocate | "judge", { x: number; y: number }> = { prosecutor: { x: -260, y: 420 }, defender: { x: 700, y: 420 }, investigator: { x: -140, y: 220 }, judge: { x: 0, y: 300 } };

const bearingOf = (b: string) => BEARING[(b === "contradicts" ? "undermines" : b) as keyof typeof BEARING] ?? BEARING.context;
const rot = (id: string) => ((id.charCodeAt(id.length - 1) * 37) % 7) - 3;

export function EvidenceWall({ c, focused, onFocus, onEvidence, onVerdict, onAgent, onSource }: {
  c: Case | null; focused: boolean; onFocus: () => void;
  onEvidence: (id: string) => void; onVerdict: () => void; onAgent: (r: Advocate) => void; onSource: (id: string) => void;
}) {
  const evidence = (c?.evidence ?? []).slice(0, SLOTS.length);
  const overflow = (c?.evidence.length ?? 0) - evidence.length;
  const leads = (c?.leads ?? []).slice(-LEAD_SLOTS.length);
  const verdict = c?.verdicts.at(-1);
  const research = !c ? DOSSIERS.flatMap((d) => d.context.slice(-1).map((x) => ({ ...x, country: d.country }))) : [];

  return (
    <div className="station absolute inset-0" data-active={focused || undefined} style={{ pointerEvents: "none" }}>
      {/* frame shadow on the wall */}
      <div className="absolute" style={{ left: 230, top: 40, width: 840, height: 400, boxShadow: "0 18px 36px rgba(60,40,20,.25)", borderRadius: 4 }} aria-hidden />

      {/* left wing: sources */}
      <Wing side="left">
        <p className="hand text-[13px] leading-none text-[#3d2a1a]">Sources</p>
        {(c?.sources ?? []).slice(0, 4).map((s) => (
          <button key={s.id} onClick={() => onSource(s.id)} disabled={!focused} className="mat-paper mt-2 block w-full p-1.5 text-left" style={{ transform: `rotate(${rot(s.id)}deg)`, pointerEvents: focused ? "auto" : "none" }}>
            {s.image && <img src={s.image.url} alt="" className="mb-1 h-[34px] w-full object-cover" style={{ filter: "saturate(.9)" }} referrerPolicy="no-referrer" />}
            <span className="typed block text-[5.5px] text-[#6b5a3c]">{s.id} · {s.publisher}</span>
            <span className="mt-0.5 font-serif text-[7px] font-semibold leading-tight line-clamp-3">{s.title}</span>
            <span className="typed mt-0.5 block text-[5px] text-[#6b5a3c]">{s.published ? `updated ${s.published.slice(0, 10)}` : "undated"}</span>
          </button>
        ))}
        {!c && <p className="hand mt-2 text-[11px] leading-tight text-[#3d2a1a]/70">Sources go here as the desks open them.</p>}
      </Wing>

      {/* right wing: positions on file */}
      <Wing side="right">
        <p className="hand text-[13px] leading-none text-[#3d2a1a]">Where we stand</p>
        {(["prosecutor", "defender", "investigator"] as Advocate[]).map((r) => {
          const f = c?.filings.filter((x) => x.role === r).at(-1);
          return (
            <div key={r} className="mt-2 border-l-2 bg-[#e8dcbf] p-1.5" style={{ borderColor: AGENT_LOOK[r].phosphor, transform: `rotate(${r === "defender" ? 1 : -1}deg)`, boxShadow: "0 3px 5px rgba(0,0,0,.4)" }}>
              <span className="typed block text-[5.5px] text-[#5a4a32]">{AGENT_LOOK[r].plate}</span>
              <span className="block text-[8px] font-semibold text-[#2b241c]">{f ? (f.timedOut ? "No filing" : stanceMeta(f.stance).label) : "—"}</span>
              {f && <span className="typed block text-[5.5px] text-[#5a4a32]">R{f.round} · {f.confidence}%{f.changed ? " · REVISED" : ""}</span>}
            </div>
          );
        })}
      </Wing>

      {/* the board */}
      <div className="absolute mat-cork-day" onClick={!focused ? onFocus : undefined}
        style={{ left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, pointerEvents: "auto", cursor: focused ? "default" : "zoom-in", border: "10px solid #8a6340", boxShadow: "inset 0 0 30px rgba(80,50,20,.35), 0 10px 24px rgba(60,40,20,.3)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(200deg, rgba(255,250,230,.25), transparent 60%)" }} />

        {/* strings: drawn under the paper, from each pin to the claim */}
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={PANEL.w - 20} height={PANEL.h - 20} aria-hidden>
          {evidence.map((e, i) => {
            const [sx, sy] = SLOTS[i];
            const x1 = sx + CLIP.w / 2, y1 = sy + 4, x2 = CLAIM.x + CLAIM.w / 2 + (x1 - 290) * 0.25, y2 = CLAIM.y + CLAIM.h - 4;
            return <motion.path key={e.id} d={`M${x1},${y1} Q${(x1 + x2) / 2},${Math.max(y1, y2) + 26} ${x2},${y2}`} fill="none" stroke={bearingOf(e.bearing).color} strokeWidth={1.3} strokeOpacity={0.9}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />;
          })}
          {/* disagreements between advocates */}
          {(c?.challenges ?? []).map((x, i) => {
            const a = TAGS[x.from] + 40, b = TAGS[x.to] + 40, lift = 26 + (i % 3) * 14;
            return (
              <g key={x.id}>
                <motion.path d={`M${a},318 Q${(a + b) / 2},${318 - lift * 2} ${b},318`} fill="none" stroke={x.kind === "framing" ? "#c9a46a" : "#a3302a"} strokeWidth={1.2} strokeDasharray="4 3"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
                <circle cx={b} cy={318} r={2.5} fill={x.kind === "framing" ? "#c9a46a" : "#a3302a"} />
              </g>
            );
          })}
        </svg>

        {/* the claim */}
        <div className="mat-paper absolute p-2" style={{ left: CLAIM.x, top: CLAIM.y, width: CLAIM.w, height: CLAIM.h, transform: "rotate(-.6deg)" }}>
          <Pin color="#a3302a" />
          <p className="typed text-[5.5px] tracking-[.1em] text-[#6b5a3c]">{c ? "CLAIM ON TRIAL" : "THE WALL IS CLEAR"}</p>
          <p className="mt-0.5 font-serif text-[8.5px] font-semibold leading-[1.15] line-clamp-4">{c ? `“${c.claim}”` : "Open a case at the table. Verified exhibits will be pinned here as the agents find them."}</p>
        </div>

        {/* exhibits */}
        <AnimatePresence>
          {evidence.map((e, i) => <Clipping key={e.id} e={e} src={c?.sources.find((x) => x.id === e.sourceId)} at={SLOTS[i]} focused={focused} onOpen={() => onEvidence(e.id)} />)}
        </AnimatePresence>

        {overflow > 0 && <p className="hand absolute text-[12px] text-[#3d2a1a]" style={{ left: 500, top: 200 }}>+{overflow} more in the case file</p>}

        {/* leads: index cards, stamped with what happened to them */}
        <AnimatePresence>
          {leads.map((l, i) => <LeadCard key={l.id} l={l} at={LEAD_SLOTS[i]} />)}
        </AnimatePresence>

        {/* before any case: real, sourced desk research from the dossiers */}
        {research.map((r, i) => (
          <div key={r.quote} className="mat-paper absolute p-1.5" style={{ left: SLOTS[[4, 6, 8][i]][0], top: SLOTS[[4, 6, 8][i]][1], width: CLIP.w + 20, transform: `rotate(${[-2, 1.5, -1][i]}deg)` }}>
            <Pin color="#8c6b43" />
            <p className="typed text-[5px] text-[#6b5a3c]">DESK RESEARCH · {r.country.toUpperCase()}</p>
            <p className="mt-0.5 font-serif text-[6.5px] leading-[1.2] line-clamp-5">“{r.quote}”</p>
            <p className="typed mt-0.5 text-[5px] text-[#6b5a3c]">{r.publisher} · {r.date}</p>
          </div>
        ))}

        {/* advocate tags, where disagreements land */}
        {c && (Object.keys(TAGS) as Advocate[]).map((r) => (
          <button key={r} onClick={() => onAgent(r)} disabled={!focused} className="absolute bg-[#e8dcbf] px-2 py-1 text-left" style={{ left: TAGS[r], top: 318, width: 80, pointerEvents: focused ? "auto" : "none", boxShadow: "0 3px 5px rgba(0,0,0,.45)", borderTop: `3px solid ${AGENT_LOOK[r].phosphor}` }}>
            <span className="typed block text-[6px] text-[#3d3222]">{AGENT_LOOK[r].plate}</span>
          </button>
        ))}

        {/* the ruling */}
        <AnimatePresence>
          {verdict && (
            <motion.button key={verdict.round} onClick={onVerdict} disabled={!focused}
              initial={{ y: 260, rotate: 8, opacity: 0 }} animate={{ y: 0, rotate: 2, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="mat-paper absolute p-2 text-left" style={{ left: 396, top: 200, width: 160, height: 104, pointerEvents: focused ? "auto" : "none" }}>
              <Pin color="#2b241c" />
              <p className="typed text-[5.5px] tracking-[.1em] text-[#6b5a3c]">RULING OF THE COURT · R{verdict.round}</p>
              <p className="mt-1 font-serif text-[13px] font-bold uppercase leading-none" style={{ color: verdict.verdict === "contradicted" ? "#a3302a" : verdict.verdict === "supported" ? "#4f5233" : verdict.verdict === "misleading" ? "#7a5a2e" : "#5b564c" }}>{stanceMeta(verdict.verdict).label}</p>
              <p className="typed text-[6px] text-[#6b5a3c]">{verdict.confidence}% confidence</p>
              <p className="mt-1 font-serif text-[7px] leading-[1.15] line-clamp-2">{verdict.headline}</p>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const short = (q: string, words = 16) => { const w = q.split(/\s+/); return w.length > words ? `${w.slice(0, words).join(" ")}…` : q; };
const isReport = (src?: Source) => !!src && /\.(org|gov|int)(\.|$)|gov\.|europa\.eu/.test(src.publisher) && !/wikipedia/.test(src.publisher);

/** A pinned exhibit. Its form follows its source: a press clipping, a report page, or a web printout. */
function Clipping({ e, src, at, focused, onOpen }: { e: Evidence; src?: Source; at: [number, number]; focused: boolean; onOpen: () => void }) {
  const from = FROM[e.citedBy];
  const b = bearingOf(e.bearing);
  const kind = src?.image && !isReport(src) ? "press" : isReport(src) ? "report" : "web";
  return (
    <motion.button onClick={onOpen} disabled={!focused} aria-label={`Exhibit ${e.id}: ${b.label}. ${e.quote}`}
      initial={{ x: from.x, y: from.y, rotate: 25, scale: 1.8, opacity: 0 }} animate={{ x: 0, y: 0, rotate: rot(e.id), scale: 1, opacity: 1 }}
      transition={{ duration: 1.1, ease: [0.3, 0.7, 0.2, 1] }}
      className="mat-paper absolute overflow-hidden text-left transition-[filter] hover:brightness-105" style={{ left: at[0], top: at[1], width: CLIP.w, height: CLIP.h, pointerEvents: focused ? "auto" : "none" }}>
      <Pin color={b.color} />
      {kind === "report" && (
        <>
          <div className="flex items-center justify-between px-1.5 py-[3px] text-[#f4ecd8]" style={{ background: "#2c3e5c" }}>
            <span className="typed text-[4.6px] tracking-[.08em]">{(src?.publisher ?? "").replace(/^www\./, "").toUpperCase()}</span>
            <span className="typed text-[4.6px]">{e.id}</span>
          </div>
          {src?.image && <img src={src.image.url} alt="" className="h-[22px] w-full object-cover" referrerPolicy="no-referrer" />}
          <p className="px-1.5 pt-1 font-serif text-[6.4px] leading-[1.25]"><span className="highlighter">{short(e.quote, src?.image ? 12 : 18)}</span></p>
        </>
      )}
      {kind === "press" && (
        <>
          <div className="relative h-[30px] w-full overflow-hidden bg-[#ddd]">
            <img src={src!.image!.url} alt="" className="halftone h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="halftone-dots absolute inset-0" />
          </div>
          <p className="px-1.5 pt-0.5 font-serif text-[7px] font-bold leading-[1.05] line-clamp-2">{src!.title}</p>
          <p className="px-1.5 font-serif text-[5.6px] leading-[1.2] line-clamp-2">“{short(e.quote, 12)}”</p>
        </>
      )}
      {kind === "web" && (
        <>
          <div className="flex items-center gap-1 border-b border-[#c9bd9f] bg-[#e6e1d6] px-1 py-[2px]">
            <span className="size-[3px] rounded-full bg-[#c4683f]" /><span className="size-[3px] rounded-full bg-[#d9a441]" />
            <span className="typed truncate text-[4.2px] text-[#5a4a32]">{e.url.replace(/^https?:\/\//, "")}</span>
          </div>
          <p className="px-1.5 pt-1 font-serif text-[6.6px] leading-[1.22]">“{short(e.quote, 16)}”</p>
        </>
      )}
      <span className="absolute bottom-0.5 left-1.5 right-1.5 flex justify-between typed text-[4.6px]"><span className="text-[#6b5a3c]">{e.id}</span><span style={{ color: b.color }}>{b.label.toUpperCase()}</span></span>
    </motion.button>
  );
}

/** A lead on an index card, handwritten by whoever raised it, stamped with its fate. */
function LeadCard({ l, at }: { l: Lead; at: [number, number] }) {
  const stamp = l.status === "assigned" ? `ON IT · ${(l.assignee ?? "").toUpperCase()}` : l.status === "reported" ? "FOLLOWED UP" : l.status === "dropped" ? "DEAD END" : "OPEN LEAD";
  const tone = l.status === "reported" ? "#4f7d4a" : l.status === "assigned" ? "#2f5f63" : l.status === "dropped" ? "#7a6a58" : "#a3302a";
  return (
    <motion.div initial={{ y: -30, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: ((l.id.charCodeAt(1) * 13) % 7) - 3 }} exit={{ opacity: 0 }}
      className="absolute p-1.5" style={{ left: at[0], top: at[1], width: 90, height: 78, background: "linear-gradient(#f6e7a6, #f1dd8c)", boxShadow: "0 4px 8px rgba(60,40,20,.3)", backgroundImage: "linear-gradient(#f6e7a6,#f1dd8c), repeating-linear-gradient(transparent 0 11px, rgba(80,110,160,.25) 11px 12px)" }}>
      <Pin color={tone} />
      <p className="typed text-[4.8px] text-[#6b5a3c]">{l.id} · {l.by === "editor" ? "EDITOR" : l.by.toUpperCase()}</p>
      <p className="hand mt-0.5 text-[9.5px] leading-[1] text-[#2b241c] line-clamp-4">{l.question}</p>
      <span className="typed absolute bottom-1 left-1.5 border px-0.5 text-[4.6px]" style={{ color: tone, borderColor: tone, transform: "rotate(-3deg)" }}>{stamp}</span>
    </motion.div>
  );
}

function Pin({ color }: { color: string }) {
  return <span className="absolute left-1/2 -top-1 block size-[7px] -translate-x-1/2 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${color})`, boxShadow: "0 2px 2px rgba(0,0,0,.6)" }} aria-hidden />;
}

function Wing({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div className="absolute" style={{ left: side === "left" ? 236 : 940, top: 46, width: 124, height: 382, perspective: 900, pointerEvents: "auto" }}>
      <div className="mat-cork-day h-full w-full p-2.5" style={{ transform: `rotateY(${side === "left" ? 34 : -34}deg)`, transformOrigin: side === "left" ? "100% 50%" : "0 50%", border: "8px solid #8a6340", boxShadow: "inset 0 0 26px rgba(80,50,20,.4)", filter: "brightness(.9)" }}>
        {children}
      </div>
    </div>
  );
}
