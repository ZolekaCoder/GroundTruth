import { useMemo } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";
import { DOSSIERS, relativeDay, type Dossier } from "../lib/elections";
import type { Case } from "../lib/types";

const countries = feature(world as any, (world as any).objects.countries) as unknown as FeatureCollection<Geometry>;
const MW = 340, MH = 170;

/**
 * The election map, printed on heavy paper and laid flat on the table (CSS 3D), with a brass pin
 * on each of the three elections. Pins open the country dossier.
 */
export function ElectionMap({ onPick, selected, interactive, showLabels }: { onPick: (id: Dossier["id"]) => void; selected: Dossier["id"] | null; interactive: boolean; showLabels: boolean }) {
  const { paths, pins } = useMemo(() => {
    const proj = geoEquirectangular().scale(MW / (2 * Math.PI)).translate([MW / 2, MH / 2 + 12]);
    const p = geoPath(proj);
    return {
      paths: countries.features.map((f) => ({ id: String(f.id), d: p(f) ?? "" })),
      pins: DOSSIERS.map((d) => ({ d, xy: proj(d.centroid)! })),
    };
  }, []);
  const ids = new Set(DOSSIERS.map((d) => d.atlasId));

  return (
    <div className="absolute" style={{ left: 630, top: 566, width: MW, height: MH, perspective: 700, perspectiveOrigin: "50% -40%" }}>
      <div className="relative h-full w-full" style={{ transform: "rotateX(62deg)", transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}>
        <div className="absolute inset-0 mat-paper mat-paper-aged" style={{ boxShadow: "0 30px 40px rgba(0,0,0,.6)" }}>
          <svg viewBox={`0 0 ${MW} ${MH}`} className="h-full w-full">
            <rect width={MW} height={MH} fill="#d8ccad" opacity={0.5} />
            {Array.from({ length: 13 }, (_, i) => <line key={i} x1={(i * MW) / 12} x2={(i * MW) / 12} y1={0} y2={MH} stroke="#8a7a5c" strokeOpacity={0.25} strokeWidth={0.5} />)}
            {Array.from({ length: 7 }, (_, i) => <line key={i} y1={(i * MH) / 6} y2={(i * MH) / 6} x1={0} x2={MW} stroke="#8a7a5c" strokeOpacity={0.25} strokeWidth={0.5} />)}
            {paths.map((p, i) => (
              <path key={i} d={p.d} fill={ids.has(p.id) ? (DOSSIERS.find((d) => d.atlasId === p.id)?.id === selected ? "#a3302a" : "#6d5236") : "#a99a78"} stroke="#5a4a32" strokeWidth={0.3} />
            ))}
            <text x={10} y={MH - 8} style={{ font: "500 7px var(--font-mono)" }} fill="#4a3e2c">ELECTIONS · 25 OCT – 4 NOV 2026</text>
          </svg>
        </div>
        {/* brass pins stand up off the paper */}
        {pins.map(({ d, xy }) => (
          <button key={d.id} disabled={!interactive} onClick={(e) => { e.stopPropagation(); onPick(d.id); }} aria-label={`Open the ${d.country} dossier: ${d.election}, ${relativeDay(d.date)}`}
            className="group absolute" style={{ left: xy[0] - 14, top: xy[1] - 14, width: 28, height: 28, transform: "rotateX(-62deg)", transformOrigin: "50% 100%", pointerEvents: interactive ? "auto" : "none" }}>
            <span className="absolute left-1/2 top-0 block -translate-x-1/2 rounded-full" style={{ width: 11, height: 11, background: d.id === selected ? "radial-gradient(circle at 35% 30%, #f0b0a0, #a3302a)" : "radial-gradient(circle at 35% 30%, #f2d9a6, #8c6b43)", boxShadow: "0 2px 3px rgba(0,0,0,.6)" }} />
            <span className="absolute left-1/2 block -translate-x-1/2" style={{ top: 10, width: 1.5, height: 14, background: "#3a3128" }} />
            <span className={`hint absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm px-1 text-[7px] text-paper transition-opacity ${showLabels ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} style={{ top: d.id === "rs" ? -16 : 26, background: "rgba(25,18,12,.85)" }}>
              {d.country} · {relativeDay(d.date)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Manila case folder: thickness, a tab, and the docket number of the open case. */
export function CaseFolder({ c, onOpen, interactive }: { c: Case | null; onOpen: () => void; interactive: boolean }) {
  return (
    <button onClick={onOpen} disabled={!interactive} aria-label="Open the case folder" className="group absolute" style={{ left: 1040, top: 640, width: 140, height: 72, pointerEvents: interactive ? "auto" : "none" }}>
      <div className="absolute inset-0" style={{ transform: "skewX(-30deg)", transformOrigin: "0 100%" }}>
        <div className="absolute inset-x-0 bottom-0 h-[5px] bg-[#8a6f45]" />
        <div className="absolute inset-0 bottom-[4px]" style={{ background: "linear-gradient(170deg,#d9bf8a,#b89a62)", boxShadow: "0 10px 18px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,240,200,.5)" }} />
        <div className="absolute -top-[8px] left-3 h-[9px] w-12 rounded-t-sm" style={{ background: "#d2b682" }} />
        <div className="typed absolute left-4 top-3 text-[8px] text-[#4a3a22]">{c ? `CASE ${c.id.slice(0, 8).toUpperCase()}` : "NEW CASE"}</div>
        <div className="absolute left-4 right-4 top-8 h-px bg-[#8a6f45]/50" />
        <div className="absolute left-4 right-10 top-11 h-px bg-[#8a6f45]/40" />
      </div>
    </button>
  );
}

/** The night edition lying on the table. Its headline is the claim on trial — product UI, not news. */
export function NightEdition({ c }: { c: Case | null }) {
  return (
    <div className="absolute" style={{ left: 440, top: 624, width: 150, height: 86, transform: "skewX(26deg) rotate(-3deg)", transformOrigin: "0 100%" }} aria-hidden>
      <div className="mat-paper absolute inset-0 overflow-hidden px-2 pt-1.5" style={{ filter: "brightness(.92) sepia(.15)" }}>
        <div className="text-center font-serif text-[11px] font-bold leading-none tracking-tight">The Ground Truth</div>
        <div className="mt-0.5 border-y border-black/50 py-px text-center typed text-[4.5px]">ELECTION EDITION · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}</div>
        <div className="mt-1 grid grid-cols-[1.1fr_1fr] gap-1.5">
          <div className="font-serif text-[8px] font-semibold leading-[1.05]">{c ? `On trial: “${c.claim.slice(0, 64)}${c.claim.length > 64 ? "…" : ""}”` : "Three elections in ten days. Every claim is a case."}</div>
          {(() => { const img = c?.sources.find((s) => s.id === c.articleSourceId)?.image ?? c?.sources.find((s) => s.image)?.image; return img
            ? <div className="relative h-[34px] overflow-hidden"><img src={img.url} alt="" className="halftone h-full w-full object-cover" referrerPolicy="no-referrer" /><div className="halftone-dots absolute inset-0" /></div>
            : <div className="h-[34px] bg-[#8aa6b8]/60" />; })()}
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[2px] bg-black/25" />)}</div>
      </div>
    </div>
  );
}

/** Typewritten desk note: the three dates, nothing more (each is in the dossiers, sourced). */
export function DeskNote() {
  return (
    <div className="absolute" style={{ left: 930, top: 610, width: 92, height: 50, transform: "skewX(-22deg) rotate(4deg)" }} aria-hidden>
      <div className="mat-paper typed absolute inset-0 p-1.5 text-[5.5px] leading-[1.35]" style={{ background: "#efe6cc" }}>
        <div>SERBIA ......... 25 OCT</div>
        <div>UNITED STATES ... 3 NOV</div>
        <div>SOUTH AFRICA .... 4 NOV</div>
        <div className="mt-1 text-[#a3302a]">— check everything</div>
      </div>
    </div>
  );
}
