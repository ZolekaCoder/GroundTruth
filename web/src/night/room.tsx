/**
 * The architecture of the Night Shift newsroom, drawn in a 1600 × 900 logical stage.
 * Pure set dressing lives here (walls, floor, window, lamps, table, shelves). Nothing in this file
 * displays case data; anything that looks like information is in the data-driven components.
 */
import { useMemo } from "react";

export const STAGE = { w: 1600, h: 900, horizon: 540, vpX: 800 };

function rand(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/** Tall steel-framed windows onto a rain-dark city. */
export function CityWindow() {
  const buildings = useMemo(() => {
    const r = rand(11);
    const out: { x: number; w: number; h: number; tone: number; lit: [number, number][] }[] = [];
    let x = 0;
    while (x < 480) {
      const w = 18 + r() * 46, h = 60 + Math.pow(r(), 1.6) * 300, tone = r();
      const lit: [number, number][] = [];
      for (let wy = 10; wy < h - 8; wy += 9) for (let wx = 4; wx < w - 4; wx += 7) if (r() < 0.16) lit.push([wx, wy]);
      out.push({ x, w, h, tone, lit });
      x += w + r() * 6;
    }
    return out;
  }, []);
  const W = 480, H = 430;
  return (
    <svg className="absolute" style={{ left: 1080, top: 40, width: W, height: H }} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141c24" />
          <stop offset=".6" stopColor="#25292c" />
          <stop offset="1" stopColor="#3d3428" />
        </linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".4" stopColor="#c9a46a" stopOpacity="0" />
          <stop offset="1" stopColor="#c9a46a" stopOpacity=".22" />
        </linearGradient>
        <radialGradient id="reflect" cx=".18" cy=".55" r=".5">
          <stop offset="0" stopColor="#f3d29a" stopOpacity=".18" />
          <stop offset="1" stopColor="#f3d29a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      {/* far skyline, then near skyline */}
      {buildings.map((b, i) => (
        <g key={i} transform={`translate(${b.x},${H - b.h * 0.55 - 40})`} opacity={0.5}>
          <rect width={b.w} height={b.h} fill="#1c1c1b" />
        </g>
      ))}
      {buildings.map((b, i) => (
        <g key={`n${i}`} transform={`translate(${b.x + 10},${H - b.h})`}>
          <rect width={b.w} height={b.h} fill={b.tone > 0.5 ? "#151513" : "#1a1916"} />
          {b.lit.map(([x, y], j) => <rect key={j} x={x} y={y} width={3} height={4} fill={j % 5 ? "#e8b96a" : "#d9d3c0"} opacity={0.55 + (j % 3) * 0.15} />)}
        </g>
      ))}
      <rect width={W} height={H} fill="url(#haze)" />
      {/* rain streaks on the glass */}
      {Array.from({ length: 70 }, (_, i) => { const r2 = rand(i + 3); const x = r2() * W, y = r2() * H; return <line key={i} x1={x} y1={y} x2={x - 2} y2={y + 10 + r2() * 18} stroke="#d8cdb6" strokeOpacity={0.08} strokeWidth={0.8} />; })}
      <rect width={W} height={H} fill="url(#reflect)" />
      {/* steel frame and mullions */}
      <g fill="#1d1b18">
        <rect x={0} y={0} width={W} height={10} /><rect x={0} y={H - 14} width={W} height={14} />
        <rect x={0} y={0} width={10} height={H} /><rect x={W - 10} y={0} width={10} height={H} />
        <rect x={W / 3 - 4} y={0} width={8} height={H} /><rect x={(2 * W) / 3 - 4} y={0} width={8} height={H} />
        <rect x={0} y={H * 0.38} width={W} height={6} />
      </g>
      <rect x={0} y={H - 14} width={W} height={2} fill="#6b5236" opacity={0.6} />
    </svg>
  );
}

/** Plaster wall, walnut wainscot and crown moulding, lit from the pendants. */
export function BackWall() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 mat-plaster" style={{ height: STAGE.horizon }} />
      {/* light falloff on the plaster: warm pools behind the lamps, shadow in the corners */}
      <div className="absolute inset-x-0 top-0" style={{
        height: STAGE.horizon,
        background: "radial-gradient(38% 60% at 50% 62%, rgba(214,170,110,.30), transparent 70%), radial-gradient(30% 50% at 12% 30%, rgba(0,0,0,.0), rgba(0,0,0,.35) 100%), linear-gradient(180deg, rgba(15,11,8,.65), rgba(15,11,8,.05) 35%, rgba(15,11,8,.25))",
      }} />
      <div className="absolute inset-x-0 mat-walnut" style={{ top: 0, height: 18, boxShadow: "0 6px 14px rgba(0,0,0,.5)" }} />
      <div className="absolute inset-x-0 mat-walnut" style={{ top: 430, height: STAGE.horizon - 430 }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,214,160,.12), rgba(0,0,0,.45))" }} />
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="absolute top-[14px] bottom-[14px] border border-black/30" style={{ left: 20 + i * 133, width: 113, boxShadow: "inset 1px 1px 0 rgba(255,220,170,.08), inset -1px -1px 0 rgba(0,0,0,.35)" }} />
        ))}
      </div>
      <div className="absolute inset-x-0" style={{ top: 426, height: 6, background: "#2a1b11", boxShadow: "0 2px 0 rgba(255,210,150,.12)" }} />
    </>
  );
}

/** Walnut floorboards converging to the vanishing point. */
export function Floor() {
  const { w, h, horizon, vpX } = STAGE;
  const boards = 26;
  return (
    <svg className="absolute left-0" style={{ top: horizon, width: w, height: h - horizon }} viewBox={`0 0 ${w} ${h - horizon}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="floorlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24170f" />
          <stop offset=".5" stopColor="#3a2517" />
          <stop offset="1" stopColor="#1b120c" />
        </linearGradient>
        <radialGradient id="pool" cx=".5" cy=".42" r=".42">
          <stop offset="0" stopColor="#d9a463" stopOpacity=".28" />
          <stop offset="1" stopColor="#d9a463" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h - horizon} fill="url(#floorlight)" />
      {Array.from({ length: boards + 1 }, (_, i) => {
        const xb = -800 + (i * (w + 1600)) / boards;
        const xt = vpX + (xb - vpX) * 0.28;
        return <line key={i} x1={xt} y1={0} x2={xb} y2={h - horizon} stroke="#120b07" strokeOpacity={0.55} strokeWidth={1.2} />;
      })}
      {[0.08, 0.2, 0.37, 0.6, 0.9].map((t, i) => <line key={i} x1={0} x2={w} y1={(h - horizon) * t} y2={(h - horizon) * t} stroke="#120b07" strokeOpacity={0.18} />)}
      <rect width={w} height={h - horizon} fill="url(#pool)" />
    </svg>
  );
}

/** Pendant lamp with a real light cone and a pool where it lands. */
export function PendantLamp({ x, shadeY, landY, spread = 260, on = true }: { x: number; shadeY: number; landY: number; spread?: number; on?: boolean }) {
  return (
    <>
      <div className="absolute" style={{ left: x - 0.5, top: 0, width: 1, height: shadeY, background: "rgba(10,8,6,.45)" }} aria-hidden />
      {on && (
        <div className="absolute pointer-events-none lamp-on" aria-hidden style={{
          left: x - spread, top: shadeY + 14, width: spread * 2, height: landY - shadeY,
          clipPath: `polygon(${50 - 4}% 0, ${50 + 4}% 0, 100% 100%, 0 100%)`,
          background: "linear-gradient(180deg, rgba(255,214,150,.16), rgba(255,214,150,.02))",
          mixBlendMode: "screen", filter: "blur(10px)",
        }} />
      )}
      <div className="absolute" style={{ left: x - 34, top: shadeY, width: 68, height: 24, borderRadius: "40px 40px 4px 4px", background: "linear-gradient(180deg,#8c6b43,#4a3622)", boxShadow: "0 3px 6px rgba(0,0,0,.6)" }} aria-hidden>
        {on && <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -3, width: 30, height: 6, borderRadius: 6, background: "#fff1cf", boxShadow: "0 0 18px 8px rgba(255,222,160,.65)" }} />}
      </div>
    </>
  );
}

/** Archive shelving: boxes and binders, deliberately unlabelled (it is set dressing, not data). */
export function ArchiveShelves() {
  const r = rand(5);
  const rows = [110, 190, 270, 350];
  return (
    <div className="absolute" style={{ left: 18, top: 90, width: 214, height: 340 }} aria-hidden>
      <div className="absolute inset-0 mat-walnut" style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,.7), 8px 10px 20px rgba(0,0,0,.5)" }} />
      {rows.map((y, i) => (
        <div key={i}>
          <div className="absolute left-2 right-2 flex items-end gap-[3px]" style={{ top: y - 90 + 12, height: 66 }}>
            {Array.from({ length: 7 }, (_, j) => {
              const box = r() > 0.55;
              return <div key={j} style={{ width: box ? 30 : 12 + r() * 8, height: box ? 40 : 46 + r() * 18, background: box ? "#b9a888" : ["#3d4232", "#5a3d27", "#2f2b26", "#6b5a3c"][j % 4], boxShadow: "inset -2px 0 0 rgba(0,0,0,.25)", opacity: 0.85 }} />;
            })}
          </div>
          <div className="absolute left-0 right-0 mat-walnut" style={{ top: y - 90 + 78, height: 8, boxShadow: "0 3px 4px rgba(0,0,0,.5)" }} />
        </div>
      ))}
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.1) 60%, rgba(0,0,0,.4))" }} />
    </div>
  );
}

/** The walnut election table. Children are positioned in stage coordinates. */
export function TableTop({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* legs and shadow */}
      <div className="absolute" style={{ left: 300, top: 740, width: 1000, height: 110, background: "radial-gradient(50% 45% at 50% 30%, rgba(0,0,0,.7), transparent 75%)" }} aria-hidden />
      {[392, 1196].map((x) => <div key={x} className="absolute mat-walnut" style={{ left: x, top: 758, width: 16, height: 70, filter: "brightness(.55)" }} aria-hidden />)}
      <div className="absolute mat-walnut" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(470px 598px, 1130px 598px, 1236px 732px, 364px 732px)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(22% 9% at 40% 72%, rgba(255,205,140,.32), transparent), radial-gradient(22% 9% at 60% 72%, rgba(255,205,140,.32), transparent), linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,0) 40%)" }} />
      </div>
      <div className="absolute mat-walnut" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(364px 732px, 1236px 732px, 1232px 762px, 368px 762px)", filter: "brightness(.5)" }} />
      <div className="absolute" aria-hidden style={{ left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(364px 731px, 1236px 731px, 1236px 733px, 364px 733px)", background: "rgba(255,214,160,.35)" }} />
      {children}
    </>
  );
}

/**
 * The lightmap: the room is dark except where something actually emits or receives light.
 * A multiply layer over the whole stage: pools under the pendants, the wall's picture light,
 * the window glow, and a cool moonlight spill across the floor for contrast.
 */
export function Lightmap() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{
        mixBlendMode: "multiply",
        background: [
          "radial-gradient(30% 22% at 50% 74%, #fff 0%, rgba(255,255,255,.0) 100%)",
          "radial-gradient(26% 26% at 41% 30%, #f4ead8 0%, rgba(255,255,255,0) 100%)",
          "radial-gradient(22% 40% at 82% 32%, #dfe6ec 0%, rgba(255,255,255,0) 100%)",
          "linear-gradient(#4a3c30, #4a3c30)",
        ].join(","),
      }} />
      {/* cool spill from the windows across the boards */}
      <div className="pointer-events-none absolute" aria-hidden style={{
        left: 0, top: 0, width: 1600, height: 900, clipPath: "polygon(1090px 540px, 1560px 540px, 1700px 900px, 1180px 900px)",
        background: "linear-gradient(180deg, rgba(150,175,200,.2), rgba(150,175,200,0))", mixBlendMode: "screen", filter: "blur(22px)",
      }} />
      {/* picture light over the evidence wall */}
      <div className="pointer-events-none absolute" aria-hidden style={{ left: 420, top: 38, width: 460, height: 14, borderRadius: 7, background: "linear-gradient(180deg,#8c6b43,#3a2a1a)", boxShadow: "0 4px 6px rgba(0,0,0,.5)" }} />
      <div className="pointer-events-none absolute lamp-on" aria-hidden style={{ left: 380, top: 50, width: 540, height: 300, background: "radial-gradient(60% 55% at 50% 0%, rgba(255,222,170,.30), transparent 75%)", mixBlendMode: "screen" }} />
    </>
  );
}

/** Two leather chairs pulled up to the table: the room is in use. Seen from behind, in shadow. */
export function Chairs() {
  return (
    <svg className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 1600, height: 900 }} viewBox="0 0 1600 900" aria-hidden>
      <defs>
        <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2f1f" />
          <stop offset=".5" stopColor="#2a1a11" />
          <stop offset="1" stopColor="#140d08" />
        </linearGradient>
        <radialGradient id="sheen" cx=".35" cy=".15" r=".6"><stop offset="0" stopColor="#ffd9a0" stopOpacity=".22" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></radialGradient>
      </defs>
      {[{ x: 640, r: -4 }, { x: 965, r: 5 }].map(({ x, r }) => (
        <g key={x} transform={`translate(${x},804) rotate(${r}) scale(.82)`}>
          <ellipse cx={0} cy={150} rx={120} ry={16} fill="#000" opacity={0.45} />
          <rect x={-8} y={96} width={16} height={56} fill="#15100c" />
          <path d="M-96,10 Q-100,-26 -60,-34 L60,-34 Q100,-26 96,10 L90,104 Q0,118 -90,104 Z" fill="url(#leather)" />
          <path d="M-96,10 Q-100,-26 -60,-34 L60,-34 Q100,-26 96,10 L90,104 Q0,118 -90,104 Z" fill="url(#sheen)" />
          {[-48, 0, 48].map((bx) => <circle key={bx} cx={bx} cy={8} r={2.4} fill="#120b07" />)}
          {[-48, 0, 48].map((bx) => <circle key={`b${bx}`} cx={bx} cy={52} r={2.4} fill="#120b07" />)}
          <path d="M-96,10 Q-100,-26 -60,-34 L60,-34 Q100,-26 96,10" fill="none" stroke="#7a5236" strokeOpacity={0.35} strokeWidth={2} />
        </g>
      ))}
    </svg>
  );
}
