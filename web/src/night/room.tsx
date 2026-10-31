/**
 * The architecture of the newsroom, drawn in a 1600 × 900 logical stage, in daylight.
 * Pure set dressing lives here (walls, floor, window, light, furniture, plants, clock). Nothing in
 * this file displays case data; anything that looks like information is in the data-driven parts.
 */
import { useEffect, useMemo, useState } from "react";

export const STAGE = { w: 1600, h: 900, horizon: 540, vpX: 800 };

function rand(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const FACADES = ["#e8d9bd", "#d9a441", "#c4683f", "#efe6d2", "#9c4a3a", "#b9c4c9", "#e2b48a", "#7f93a6", "#d7c3a0"];

/** Tall steel windows onto a sunlit city: varied facades, trees, a church tower, drifting cloud. */
export function CityWindow() {
  const W = 480, H = 430;
  const city = useMemo(() => {
    const r = rand(23);
    const far: { x: number; w: number; h: number }[] = [];
    for (let x = 0; x < W; ) { const w = 30 + r() * 50; far.push({ x, w, h: 90 + r() * 120 }); x += w; }
    const near: { x: number; w: number; h: number; c: string; roof: number; win: [number, number][] }[] = [];
    for (let x = -6; x < W; ) {
      const w = 34 + r() * 52, h = 70 + Math.pow(r(), 1.3) * 190, c = FACADES[Math.floor(r() * FACADES.length)];
      const win: [number, number][] = [];
      for (let wy = 16; wy < h - 14; wy += 15) for (let wx = 6; wx < w - 8; wx += 11) win.push([wx, wy]);
      near.push({ x, w, h, c, roof: r(), win });
      x += w + 2;
    }
    return { far, near };
  }, []);
  return (
    <svg className="absolute" style={{ left: 1080, top: 40, width: W, height: H }} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <linearGradient id="daysky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fa9d6" />
          <stop offset=".55" stopColor="#a9d0ea" />
          <stop offset="1" stopColor="#e6eef0" />
        </linearGradient>
        <linearGradient id="sunface" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="6" /></filter>
        <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset=".6" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#daysky)" />
      <g className="cloud" filter="url(#soft)" fill="#fff" opacity={0.85}>
        <ellipse cx={90} cy={70} rx={60} ry={14} /><ellipse cx={120} cy={60} rx={36} ry={16} />
        <ellipse cx={330} cy={110} rx={70} ry={12} /><ellipse cx={360} cy={100} rx={38} ry={14} />
      </g>
      {city.far.map((b, i) => <rect key={i} x={b.x} y={H - 110 - b.h} width={b.w} height={b.h + 110} fill="#a9bccb" opacity={0.55} />)}
      {/* a church tower on the skyline */}
      <g transform={`translate(300,${H - 330})`} fill="#c9b48e">
        <rect x={0} y={40} width={26} height={190} /><polygon points="-2,40 13,0 28,40" fill="#4f7d6a" /><circle cx={13} cy={70} r={6} fill="#efe6d2" />
      </g>
      {city.near.map((b, i) => (
        <g key={i} transform={`translate(${b.x},${H - b.h})`}>
          <rect width={b.w} height={b.h} fill={b.c} />
          {b.roof > 0.6 && <polygon points={`0,0 ${b.w / 2},-14 ${b.w},0`} fill="#9c4a3a" />}
          {b.win.map(([x, y], j) => <rect key={j} x={x} y={y} width={5} height={8} fill={j % 7 === 0 ? "#f4e7c8" : "#5d7286"} opacity={0.75} />)}
          <rect width={b.w} height={b.h} fill="url(#sunface)" />
        </g>
      ))}
      {/* street trees */}
      {Array.from({ length: 11 }, (_, i) => <circle key={i} cx={20 + i * 45} cy={H - 22} r={18 + (i % 3) * 4} fill={i % 2 ? "#5f8f4e" : "#4f7d4a"} />)}
      <rect width={W} height={H} fill="url(#glare)" />
      {/* frame and mullions: painted steel */}
      <g fill="#2e3b3d">
        <rect x={0} y={0} width={W} height={10} /><rect x={0} y={H - 14} width={W} height={14} />
        <rect x={0} y={0} width={10} height={H} /><rect x={W - 10} y={0} width={10} height={H} />
        <rect x={W / 3 - 4} y={0} width={8} height={H} /><rect x={(2 * W) / 3 - 4} y={0} width={8} height={H} />
        <rect x={0} y={H * 0.38} width={W} height={6} />
      </g>
      <rect x={0} y={H - 14} width={W} height={3} fill="#f3ead8" opacity={0.7} />
    </svg>
  );
}

/** Warm plaster wall, deep-teal panelling with a brass rail, white cornice. */
export function BackWall() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 mat-plaster-day" style={{ height: STAGE.horizon }} />
      <div className="absolute inset-x-0 top-0" style={{
        height: STAGE.horizon,
        background: "radial-gradient(45% 70% at 78% 40%, rgba(255,246,220,.55), transparent 70%), linear-gradient(90deg, rgba(60,45,30,.18), transparent 30%, transparent 70%, rgba(255,250,235,.15))",
      }} />
      <div className="absolute inset-x-0" style={{ top: 0, height: 16, background: "linear-gradient(180deg,#f7f2e8,#d9cfbd)", boxShadow: "0 4px 10px rgba(80,60,40,.18)" }} />
      <div className="absolute inset-x-0" style={{ top: 430, height: STAGE.horizon - 430, background: "linear-gradient(180deg,#356a6e,#2a5458)" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="absolute top-[14px] bottom-[14px]" style={{ left: 20 + i * 133, width: 113, boxShadow: "inset 2px 2px 0 rgba(255,255,255,.12), inset -2px -2px 0 rgba(0,0,0,.18)" }} />
        ))}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.15), transparent 40%, rgba(255,240,200,.12))" }} />
      </div>
      <div className="absolute inset-x-0" style={{ top: 426, height: 6, background: "linear-gradient(180deg,#e2c27a,#9c7a3c)" }} />
    </>
  );
}

/** Oak floorboards converging to the vanishing point, with a kilim rug under the table. */
export function Floor() {
  const { w, h, horizon, vpX } = STAGE;
  const boards = 30;
  const fh = h - horizon;
  return (
    <svg className="absolute left-0" style={{ top: horizon, width: w, height: fh }} viewBox={`0 0 ${w} ${fh}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="oak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a87b52" />
          <stop offset="1" stopColor="#c99868" />
        </linearGradient>
        <pattern id="kilim" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="#a8432c" />
          <polygon points="0,10 10,0 20,10 10,20" fill="#e3b45c" />
          <polygon points="20,10 30,0 40,10 30,20" fill="#28505a" />
          <polygon points="6,10 10,6 14,10 10,14" fill="#f1e4c6" />
        </pattern>
      </defs>
      <rect width={w} height={fh} fill="url(#oak)" />
      {Array.from({ length: boards + 1 }, (_, i) => {
        const xb = -800 + (i * (w + 1600)) / boards;
        const xt = vpX + (xb - vpX) * 0.28;
        return <line key={i} x1={xt} y1={0} x2={xb} y2={fh} stroke="#7a5536" strokeOpacity={0.35} strokeWidth={1} />;
      })}
      {[0.1, 0.24, 0.42, 0.66, 0.94].map((t, i) => <line key={i} x1={0} x2={w} y1={fh * t} y2={fh * t} stroke="#7a5536" strokeOpacity={0.12} />)}
      {/* the rug */}
      <polygon points={`420,130 1180,130 1400,${fh} 200,${fh}`} fill="#7d2f20" />
      <polygon points={`436,140 1164,140 1376,${fh} 224,${fh}`} fill="url(#kilim)" opacity={0.92} />
      <polygon points={`470,158 1130,158 1320,${fh} 280,${fh}`} fill="#8f3a26" opacity={0.85} />
      <polygon points={`420,130 1180,130 1400,${fh} 200,${fh}`} fill="none" stroke="#f1e4c6" strokeOpacity={0.4} strokeDasharray="2 5" strokeWidth={2} />
    </svg>
  );
}

/** Brass pendant lamps: off in daylight, decorative fixtures that ground the table. */
export function PendantLamp({ x, shadeY }: { x: number; shadeY: number; landY?: number; spread?: number }) {
  return (
    <>
      <div className="absolute" style={{ left: x - 0.5, top: 0, width: 1, height: shadeY, background: "rgba(40,30,20,.5)" }} aria-hidden />
      <div className="absolute" style={{ left: x - 34, top: shadeY, width: 68, height: 26, borderRadius: "40px 40px 4px 4px", background: "linear-gradient(160deg,#e9c77f,#a07a3a 60%,#6d4f22)", boxShadow: "0 6px 10px rgba(60,40,20,.3)" }} aria-hidden />
    </>
  );
}

/** Daylight: sun shafts across the floor and table from the windows, soft occlusion in corners. */
export function Lightmap() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{
        background: "radial-gradient(140% 100% at 70% 40%, transparent 55%, rgba(70,50,30,.22) 100%)",
      }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="pointer-events-none absolute" aria-hidden style={{
          left: 0, top: 0, width: 1600, height: 900,
          clipPath: `polygon(${1090 + i * 160}px 470px, ${1230 + i * 160}px 470px, ${930 + i * 230}px 900px, ${700 + i * 230}px 900px)`,
          background: "linear-gradient(200deg, rgba(255,244,214,.38), rgba(255,244,214,.08))", mixBlendMode: "soft-light", filter: "blur(10px)",
        }} />
      ))}
      <div className="pointer-events-none absolute" aria-hidden style={{ left: 980, top: 30, width: 620, height: 480, background: "radial-gradient(50% 50% at 60% 40%, rgba(255,250,230,.35), transparent 70%)", mixBlendMode: "screen" }} />
    </>
  );
}

/** Shelving: colourful binders, archive boxes, a trailing plant. Unlabelled set dressing. */
export function ArchiveShelves() {
  const r = rand(5);
  const rows = [110, 190, 270, 350];
  const spines = ["#b8432f", "#2f5f63", "#d9a441", "#3c5a8a", "#6d7046", "#e8d9bd", "#8a3f5a", "#c4683f"];
  return (
    <div className="absolute" style={{ left: 18, top: 90, width: 214, height: 340 }} aria-hidden>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#c99868,#a87b52)", boxShadow: "inset 0 0 30px rgba(70,45,20,.45), 6px 8px 16px rgba(70,50,30,.3)" }} />
      {rows.map((y, i) => (
        <div key={i}>
          <div className="absolute left-2 right-2 flex items-end gap-[3px]" style={{ top: y - 90 + 12, height: 66 }}>
            {Array.from({ length: 8 }, (_, j) => {
              const box = r() > 0.72;
              return <div key={j} style={{ width: box ? 30 : 11 + r() * 9, height: box ? 38 : 44 + r() * 20, background: box ? "#e8dcc0" : spines[Math.floor(r() * spines.length)], boxShadow: "inset -2px 0 0 rgba(0,0,0,.18), inset 0 6px 0 rgba(255,255,255,.12)" }} />;
            })}
          </div>
          <div className="absolute left-0 right-0" style={{ top: y - 90 + 78, height: 8, background: "#8a6340", boxShadow: "0 3px 4px rgba(60,40,20,.35)" }} />
        </div>
      ))}
      {/* trailing pothos on the top shelf */}
      <svg className="absolute sway" style={{ left: 120, top: -24, width: 90, height: 150 }} viewBox="0 0 90 150">
        <rect x={20} y={10} width={34} height={22} rx={3} fill="#c4683f" />
        {[[30, 30], [22, 52], [40, 70], [28, 92], [44, 112], [34, 134], [60, 40], [66, 62]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={9} ry={6} fill={i % 2 ? "#5f8f4e" : "#4f7d4a"} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
        <path d="M37,30 C30,60 46,90 34,140 M48,30 C62,46 66,60 66,70" stroke="#3e6b3a" strokeWidth={1.4} fill="none" />
      </svg>
    </div>
  );
}

/** A fiddle-leaf fig in a terracotta pot by the window. */
export function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <svg className="pointer-events-none absolute" style={{ left: x, top: y, width: 160 * s, height: 300 * s }} viewBox="0 0 160 300" aria-hidden>
      <ellipse cx={80} cy={292} rx={56} ry={8} fill="#5a3d27" opacity={0.25} />
      <g className="sway">
        <path d="M80,240 C78,180 84,120 76,40" stroke="#5a4028" strokeWidth={4} fill="none" />
        {[[60, 60, -30], [100, 76, 30], [54, 104, -40], [104, 124, 35], [62, 150, -30], [98, 172, 30], [76, 34, 0], [56, 196, -35]].map(([cx, cy, r], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={20} ry={30} transform={`rotate(${r} ${cx} ${cy})`} fill={["#3f6f3a", "#4f8a47", "#5f9a52"][i % 3]} stroke="#2f5a2c" strokeWidth={0.8} />
        ))}
      </g>
      <path d="M44,232 L116,232 L106,296 L54,296 Z" fill="#c4683f" />
      <rect x={40} y={226} width={80} height={12} rx={2} fill="#d47a50" />
    </svg>
  );
}

/** A real wall clock: it shows the viewer's actual time. */
export function WallClock({ x, y }: { x: number; y: number }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(iv); }, []);
  const m = now.getMinutes(), h = (now.getHours() % 12) + m / 60;
  return (
    <svg className="pointer-events-none absolute" style={{ left: x, top: y, width: 64, height: 64 }} viewBox="0 0 64 64" aria-label={`Clock: ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}>
      <circle cx={32} cy={34} r={29} fill="#2d2a26" opacity={0.2} />
      <circle cx={32} cy={32} r={29} fill="#f7f1e3" stroke="#2f5f63" strokeWidth={4} />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={32} y1={7} x2={32} y2={i % 3 ? 10 : 13} stroke="#2d2a26" strokeWidth={i % 3 ? 1 : 2} transform={`rotate(${i * 30} 32 32)`} />)}
      <line x1={32} y1={32} x2={32} y2={17} stroke="#2d2a26" strokeWidth={3} strokeLinecap="round" transform={`rotate(${h * 30} 32 32)`} />
      <line x1={32} y1={32} x2={32} y2={11} stroke="#2d2a26" strokeWidth={2} strokeLinecap="round" transform={`rotate(${m * 6} 32 32)`} />
      <circle cx={32} cy={32} r={2.5} fill="#c4683f" />
    </svg>
  );
}

/** The oak election table. Children are positioned in stage coordinates. */
export function TableTop({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <div className="absolute" style={{ left: 300, top: 740, width: 1000, height: 110, background: "radial-gradient(50% 45% at 50% 30%, rgba(60,30,15,.35), transparent 75%)" }} aria-hidden />
      {[392, 1196].map((x) => <div key={x} className="absolute" style={{ left: x, top: 758, width: 16, height: 70, background: "#6d4a2c" }} aria-hidden />)}
      <div className="absolute mat-oak" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(470px 598px, 1130px 598px, 1236px 732px, 364px 732px)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, rgba(255,248,225,.35), rgba(255,255,255,0) 50%), linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,0) 40%)" }} />
      </div>
      <div className="absolute mat-oak" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(364px 732px, 1236px 732px, 1232px 762px, 368px 762px)", filter: "brightness(.72)" }} />
      <div className="absolute" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(364px 731px, 1236px 731px, 1236px 733px, 364px 733px)", background: "rgba(255,240,210,.7)" }} />
      {children}
    </>
  );
}

/** Two mid-century chairs pulled up to the table: the room is in use. */
export function Chairs() {
  return (
    <svg className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 1600, height: 900 }} viewBox="0 0 1600 900" aria-hidden>
      <defs>
        <linearGradient id="tan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c98a52" /><stop offset="1" stopColor="#8f5a2e" /></linearGradient>
      </defs>
      {[{ x: 640, r: -4 }, { x: 965, r: 5 }].map(({ x, r }) => (
        <g key={x} transform={`translate(${x},842) rotate(${r}) scale(.66)`}>
          <ellipse cx={0} cy={150} rx={120} ry={16} fill="#3a1d10" opacity={0.25} />
          <rect x={-70} y={96} width={10} height={60} fill="#5a3a22" transform="rotate(8 -65 96)" />
          <rect x={60} y={96} width={10} height={60} fill="#5a3a22" transform="rotate(-8 65 96)" />
          <path d="M-96,10 Q-100,-26 -60,-34 L60,-34 Q100,-26 96,10 L90,104 Q0,118 -90,104 Z" fill="url(#tan)" />
          <path d="M-80,0 Q-82,-18 -52,-22 L52,-22 Q82,-18 80,0 L76,86 Q0,96 -76,86 Z" fill="#b97a44" opacity={0.6} />
          <path d="M-96,10 Q-100,-26 -60,-34 L60,-34 Q100,-26 96,10" fill="none" stroke="#f0c48e" strokeOpacity={0.6} strokeWidth={2} />
        </g>
      ))}
    </svg>
  );
}
