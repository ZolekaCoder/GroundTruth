import { AnimatePresence, motion } from "motion/react";
import type { Advocate, Case, Role } from "../lib/types";

/**
 * The newsroom's journalists. Each is an illustrated stand-in for one Mozaik AI agent, and every
 * pose is driven by the case: typing while its loop runs, on the phone while chasing an assigned
 * lead, walking a clipping to the wall when a quote is verified, speaking when it challenges or
 * rebuts. Nothing here is decorative motion pretending to be work.
 */

type Look = { skin: string; hair: string; top: string; accent: string; style: "curls" | "beard" | "bob" | "silver" };
export const LOOKS: Record<Role, Look> = {
  prosecutor: { skin: "#8d5a3b", hair: "#1f1712", top: "#b8432f", accent: "#f1e4c6", style: "curls" },
  defender: { skin: "#e3b896", hair: "#8a8580", top: "#5f6b3a", accent: "#e8dcc0", style: "beard" },
  investigator: { skin: "#c68a5e", hair: "#2a1d14", top: "#d9a441", accent: "#2f5f63", style: "bob" },
  judge: { skin: "#f0cba8", hair: "#d8d3cc", top: "#2c3e5c", accent: "#e9c77f", style: "silver" },
};

type Pose = "typing" | "phone" | "reading" | "idle";

function Head({ look }: { look: Look }) {
  return (
    <g>
      {look.style === "bob" && <path d="M41,10 Q58,2 70,14 L72,34 Q66,30 64,22 Q52,24 44,18 Z" fill={look.hair} />}
      <ellipse cx={58} cy={24} rx={12} ry={13.5} fill={look.skin} />
      <ellipse cx={69} cy={26} rx={2.4} ry={3} fill={look.skin} />
      {/* profile face: brow, eye, nose, mouth — enough to read as a person, not a mannequin */}
      <path d="M61,19.5 q2.6,-1.4 5,-.2" stroke="#2b1d14" strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.8} />
      <ellipse cx={64} cy={22.6} rx={1.1} ry={1.4} fill="#1d1510" />
      <path d="M69.5,21 L72.4,27 L69.6,27.6" fill={look.skin} stroke="#000" strokeOpacity={0.18} strokeWidth={0.6} />
      <path d="M64.5,31.2 q2,.8 3.8,-.2" stroke="#6b3a2a" strokeWidth={1} fill="none" strokeLinecap="round" />
      <ellipse cx={61} cy={27} rx={2.6} ry={1.6} fill="#d9785a" opacity={0.18} />
      {look.style === "curls" && <g fill={look.hair}>{[[47, 15], [53, 9], [61, 9], [67, 13], [45, 23], [48, 31], [43, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={6.6} />)}</g>}
      {look.style === "beard" && <><path d="M46,16 Q56,6 70,15 L70,19 Q58,13 47,20 Z" fill={look.hair} /><path d="M58,30 Q66,42 72,28 L72,24 Q68,34 60,30 Z" fill={look.hair} /></>}
      {look.style === "bob" && <><path d="M45,12 Q58,4 70,13 L70,18 Q58,12 46,19 Z" fill={look.hair} /><rect x={62} y={22} width={9} height={6} rx={2} fill="none" stroke="#2d2a26" strokeWidth={1.3} /></>}
      {look.style === "silver" && <path d="M45,20 Q46,6 60,7 Q72,8 71,20 L71,26 Q66,14 56,15 Q50,16 47,30 Z" fill={look.hair} />}
    </g>
  );
}

/** A journalist seated in profile, facing right (mirror for facing left). */
export function SeatedJournalist({ role, pose, x, y, s, faceLeft }: { role: Role; pose: Pose; x: number; y: number; s: number; faceLeft?: boolean }) {
  const look = LOOKS[role];
  return (
    <div className="pointer-events-none absolute" style={{ left: x, top: y, width: 100 * s, height: 150 * s, transform: faceLeft ? "scaleX(-1)" : undefined }} aria-hidden>
      <svg viewBox="0 0 100 150" className="h-full w-full overflow-visible">
        {/* chair */}
        <rect x={14} y={52} width={12} height={62} rx={5} fill="#3a3530" />
        <rect x={16} y={108} width={46} height={9} rx={3} fill="#3a3530" />
        <rect x={36} y={117} width={5} height={26} fill="#2a2622" />
        <ellipse cx={38} cy={145} rx={22} ry={3.5} fill="#2a2622" opacity={0.6} />
        <g className="breathe">
          {/* torso, leaning toward the desk */}
          <path d="M30,44 Q44,36 60,42 L66,74 Q62,104 56,110 L26,110 Q22,80 30,44 Z" fill={look.top} transform={pose === "reading" || pose === "idle" ? "rotate(-6 40 108)" : "rotate(6 40 108)"} />
          <path d="M50,40 L58,44 L56,52 Z" fill={look.accent} />
          {/* thigh */}
          <path d="M28,104 L74,104 Q80,106 78,114 L30,116 Z" fill="#2f3440" />
          <path d="M70,108 L74,140 L82,140 L80,108 Z" fill="#2f3440" />
          <path d="M72,138 L90,138 Q92,144 86,145 L72,145 Z" fill="#1d1a17" />
          <g transform={pose === "reading" || pose === "idle" ? "translate(-4,0) rotate(-6 40 108)" : "translate(4,0) rotate(6 40 108)"}>
            <Head look={look} />
          </g>
          {/* arm */}
          {pose === "typing" && (
            <g className="typing" style={{ transformOrigin: "50px 54px" }}>
              <path d="M46,50 Q56,74 66,80 L92,80 L92,86 L64,88 Q48,80 40,58 Z" fill={look.top} />
              <ellipse cx={94} cy={83} rx={5} ry={3.4} fill={look.skin} />
            </g>
          )}
          {pose === "phone" && (
            <g>
              <path d="M44,52 Q60,62 66,40 L72,30 L77,33 L72,46 Q62,72 40,62 Z" fill={look.top} />
              <rect x={66} y={18} width={7} height={18} rx={2.5} fill="#1d1a17" transform="rotate(18 70 27)" />
              <ellipse cx={73} cy={33} rx={4} ry={4} fill={look.skin} />
            </g>
          )}
          {(pose === "reading" || pose === "idle") && (
            <g>
              <path d="M42,52 Q52,78 68,72 L74,66 L77,70 L70,80 Q50,90 36,62 Z" fill={look.top} />
              {pose === "reading"
                ? <g transform="rotate(-14 80 60)"><rect x={70} y={46} width={22} height={28} fill="#f4ecd8" stroke="#c9bd9f" strokeWidth={0.6} />{[52, 56, 60, 64].map((ly) => <line key={ly} x1={73} x2={89} y1={ly} y2={ly} stroke="#9a8e74" strokeWidth={0.8} />)}</g>
                : <g><rect x={72} y={64} width={10} height={12} rx={2} fill="#f4ecd8" /><path d="M82,67 q5,0 5,4 q0,4 -5,4" fill="none" stroke="#f4ecd8" strokeWidth={1.6} /></g>}
              <ellipse cx={75} cy={70} rx={4.4} ry={3.2} fill={look.skin} />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

/** A standing journalist (for walking to the wall, or the editor at the window). */
export function StandingJournalist({ role, carrying, s = 1, faceLeft }: { role: Role; carrying?: boolean; s?: number; faceLeft?: boolean }) {
  const look = LOOKS[role];
  return (
    <svg viewBox="0 0 100 200" style={{ width: 100 * s, height: 200 * s, transform: faceLeft ? "scaleX(-1)" : undefined }} className="overflow-visible" aria-hidden>
      <ellipse cx={56} cy={196} rx={24} ry={4} fill="#2a1a10" opacity={0.25} />
      <path d="M48,120 L44,190 L52,190 L58,124 Z" fill="#2f3440" />
      <path d="M58,120 L64,190 L72,190 L68,120 Z" fill="#2f3440" />
      <path d="M42,188 L56,188 L56,194 L40,194 Z" fill="#1d1a17" /><path d="M62,188 L78,188 L78,194 L62,194 Z" fill="#1d1a17" />
      <path d="M40,46 Q56,38 72,46 L74,124 L40,124 Z" fill={look.top} />
      <path d="M52,42 L60,46 L57,54 Z" fill={look.accent} />
      <g transform="translate(-2,8)"><Head look={look} /></g>
      {carrying ? (
        <g><path d="M66,52 L84,80 L80,84 L62,62 Z" fill={look.top} /><g transform="rotate(-10 88 76)"><rect x={78} y={60} width={22} height={28} fill="#f4ecd8" stroke="#c9bd9f" strokeWidth={0.6} /><rect x={81} y={63} width={16} height={8} fill="#8a8f96" /></g><ellipse cx={84} cy={80} rx={4} ry={3} fill={look.skin} /></g>
      ) : (
        <g><path d="M66,52 L72,98 L66,100 L60,60 Z" fill={look.top} /><ellipse cx={70} cy={100} rx={4} ry={3.4} fill={look.skin} /><rect x={66} y={88} width={10} height={12} rx={2} fill="#f4ecd8" /></g>
      )}
    </svg>
  );
}

/** Speech: short, handwritten, anchored over a desk. */
export function Speech({ x, y, text, tone, flip }: { x: number; y: number; text: string; tone: "challenge" | "concede" | "rebut" | "note"; flip?: boolean }) {
  const border = tone === "challenge" ? "#a3302a" : tone === "concede" ? "#4f7d4a" : tone === "rebut" ? "#2f5f63" : "#8a6f45";
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}
      className="pointer-events-none absolute max-w-[190px] rounded-[10px] bg-[#fffaf0] px-2.5 py-1.5 text-[#2b241c]" style={{ left: x, top: y, border: `2px solid ${border}`, boxShadow: "0 6px 14px rgba(60,40,20,.25)" }} aria-hidden>
      <p className="hand text-[15px] leading-[1.05]">{text}</p>
      <span className="absolute -bottom-[7px] block size-3 rotate-45 bg-[#fffaf0]" style={{ [flip ? "right" : "left"]: 18, borderRight: `2px solid ${border}`, borderBottom: `2px solid ${border}` } as React.CSSProperties} />
    </motion.div>
  );
}

// each desk pins to its own stretch of the wall, so reporters don't pile into one spot
const PIN_AT: Record<Advocate, number> = { prosecutor: 520, investigator: 700, defender: 880 };
const SEATS: Record<Advocate, { x: number; y: number; s: number; faceLeft: boolean; bubble: { x: number; y: number; flip?: boolean }; walkFrom: { x: number; y: number }; walkS: number }> = {
  prosecutor: { x: 344, y: 618, s: 1.12, faceLeft: true, bubble: { x: 300, y: 560 }, walkFrom: { x: 360, y: 600 }, walkS: 1.0 },
  defender: { x: 1146, y: 618, s: 1.12, faceLeft: false, bubble: { x: 1090, y: 560, flip: true }, walkFrom: { x: 1150, y: 600 }, walkS: 1.0 },
  investigator: { x: 392, y: 470, s: 0.62, faceLeft: true, bubble: { x: 380, y: 420 }, walkFrom: { x: 400, y: 440 }, walkS: 0.62 },
};

const clip = (t: string, n = 46) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** Everyone in the room, posed from the case at time `now`. */
export function Newsroom({ c, now }: { c: Case | null; now: number }) {
  const recent = (at: number, ms: number) => at <= now && now - at < ms;
  const assignedLead = (r: Advocate) => c?.phase === "leads" && c.leads.some((l) => l.assignee === r && l.status === "assigned");

  return (
    <>
      {(Object.keys(SEATS) as Advocate[]).map((r) => {
        const seat = SEATS[r];
        const walking = c?.evidence.filter((e) => e.citedBy === r && recent(e.at, 3800)).at(-1);
        const busy = !!c?.busy[r];
        const justFiled = c?.filings.some((f) => f.role === r && recent(f.at, 5000));
        const pose: Pose = busy ? (assignedLead(r) ? "phone" : "typing") : justFiled || c ? "reading" : "idle";
        const challenge = c?.challenges.filter((x) => x.from === r && recent(x.at, 7000)).at(-1);
        const rebuttal = c?.rebuttals.filter((x) => x.by === r && recent(x.at, 7000)).at(-1);
        const raised = c?.leads.filter((l) => l.by === r && recent(l.at, 6000)).at(-1);
        return (
          <div key={r}>
            {!walking && <SeatedJournalist role={r} pose={pose} x={seat.x} y={seat.y} s={seat.s} faceLeft={seat.faceLeft} />}
            <AnimatePresence>
              {walking && (
                <motion.div key={walking.id} className="pointer-events-none absolute" style={{ left: 0, top: 0 }}
                  initial={{ x: seat.walkFrom.x, y: seat.walkFrom.y - 60, opacity: 0 }}
                  animate={{ x: [seat.walkFrom.x, PIN_AT[r], PIN_AT[r]], y: [seat.walkFrom.y - 60, 300, 300], scale: [1, seat.walkS === 1 ? 0.6 : 1, seat.walkS === 1 ? 0.6 : 1], opacity: [1, 1, 1] }}
                  exit={{ opacity: 0 }} transition={{ duration: 3.2, times: [0, 0.75, 1], ease: "easeInOut" }}>
                  <StandingJournalist role={r} carrying s={seat.walkS * 0.9} faceLeft={seat.walkFrom.x > PIN_AT[r]} />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {challenge ? <Speech key={challenge.id} x={seat.bubble.x} y={seat.bubble.y} flip={seat.bubble.flip} tone="challenge" text={`${challenge.kind === "framing" ? "That's framing" : "That's wrong"}, ${challenge.to}: ${clip(challenge.point, 60)}`} />
                : rebuttal ? <Speech key={rebuttal.id} x={seat.bubble.x} y={seat.bubble.y} flip={seat.bubble.flip} tone={rebuttal.concede ? "concede" : "rebut"} text={rebuttal.concede ? `Fair point — I concede ${rebuttal.challengeId}.` : `Not so: ${clip(rebuttal.response, 54)}`} />
                : raised ? <Speech key={raised.id} x={seat.bubble.x} y={seat.bubble.y} flip={seat.bubble.flip} tone="note" text={`Lead! ${clip(raised.question, 58)}`} /> : null}
            </AnimatePresence>
          </div>
        );
      })}
      <Editor c={c} />
    </>
  );
}

/** The editor-in-chief (the Judge agent): by the window until the case reaches the bench. */
function Editor({ c }: { c: Case | null }) {
  const atWall = c?.phase === "deliberation" || c?.phase === "verdict";
  const busy = !!c?.busy.judge;
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 0, top: 0 }} initial={false}
      animate={atWall ? { x: 930, y: 262 } : { x: 1004, y: 300 }} transition={{ duration: 2.4, ease: "easeInOut" }}>
      <StandingJournalist role="judge" s={1.08} faceLeft={atWall} carrying={busy} />
      {busy && <Speech x={-40} y={-40} tone="note" text="Weighing the exhibits…" />}
    </motion.div>
  );
}
