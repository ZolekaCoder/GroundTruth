import { useEffect, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";
import { DOSSIERS, relativeDay, type Dossier } from "../lib/elections";

const NOVI_SAD: [number, number] = [19.83, 45.27];
const countries = feature(world as any, (world as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
const graticule = geoGraticule10();
const reduceMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Orthographic election globe. Motion is reserved for meaning: it turns to face the dossier you
 * open, and the dispatch lines trace from Novi Sad (where the desk files from) to each election.
 */
export function Globe({ selected, onSelect }: { selected: Dossier["id"]; onSelect: (id: Dossier["id"]) => void }) {
  const size = 560;
  const target = DOSSIERS.find((d) => d.id === selected)!;
  const [rot, setRot] = useState<[number, number]>([-target.centroid[0], -target.centroid[1] + 12]);
  const rotRef = useRef(rot);
  rotRef.current = rot;
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null);

  // turn to the selected country
  useEffect(() => {
    const from = rotRef.current;
    const to: [number, number] = [-target.centroid[0], -target.centroid[1] + 12];
    let dLon = ((to[0] - from[0] + 540) % 360) - 180;
    if (reduceMotion) { setRot(to); return; }
    const start = performance.now(), dur = 1100;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
      setRot([from[0] + dLon * e, from[1] + (to[1] - from[1]) * e]);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const projection = useMemo(() => geoOrthographic().scale(size / 2 - 8).translate([size / 2, size / 2]).rotate(rot).clipAngle(90), [rot]);
  const path = geoPath(projection);
  const centre: [number, number] = [-rot[0], -rot[1]];
  const visible = (p: [number, number]) => geoDistance(p, centre) < Math.PI / 2 - 0.05;
  const dossierFor = (id: string | number | undefined) => DOSSIERS.find((d) => d.atlasId === String(id));

  return (
    <div className="relative mx-auto w-full max-w-[560px] select-none">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full touch-none cursor-grab active:cursor-grabbing" role="img"
        aria-label="Globe highlighting Serbia, the United States and South Africa. Use the country buttons to open each dossier."
        onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, r: rotRef.current }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; setRot([d.r[0] + (e.clientX - d.x) * 0.35, Math.max(-60, Math.min(60, d.r[1] - (e.clientY - d.y) * 0.35))]); }}
        onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
        <defs>
          <radialGradient id="limb" cx="50%" cy="45%" r="55%">
            <stop offset="70%" stopColor="#1b1a16" />
            <stop offset="100%" stopColor="#0e0d0b" />
          </radialGradient>
        </defs>
        <path d={path({ type: "Sphere" })!} fill="url(#limb)" stroke="#34312b" />
        <path d={path(graticule)!} fill="none" stroke="#2a2823" strokeWidth={0.6} />
        {countries.features.map((f: Feature<Geometry, { name: string }>, i) => {
          const d = dossierFor(f.id);
          const isSel = d?.id === selected;
          return (
            <path key={i} d={path(f) ?? ""} onClick={d ? () => onSelect(d.id) : undefined}
              fill={d ? (isSel ? "var(--color-red)" : "#7a6440") : "#26241f"}
              stroke={d ? "#efe8d8" : "#3a372f"} strokeWidth={d ? (isSel ? 1.1 : 0.5) : 0.4}
              className={d ? "cursor-pointer transition-[fill] duration-500" : undefined}>
              {d && <title>{d.country}: {d.election}</title>}
            </path>
          );
        })}
        {/* dispatch lines from the desk in Novi Sad */}
        {DOSSIERS.filter((d) => d.id !== "rs").map((d) => {
          const interp = geoInterpolate(NOVI_SAD, d.centroid);
          const line = { type: "LineString" as const, coordinates: Array.from({ length: 41 }, (_, i) => interp(i / 40)) };
          return <path key={d.id} d={path(line) ?? ""} fill="none" stroke={d.id === selected ? "#efe8d8" : "#c4a265"} strokeOpacity={d.id === selected ? 0.9 : 0.45} strokeWidth={1} strokeDasharray="3 4" className="gt-dash" />;
        })}
        {visible(NOVI_SAD) && (() => { const [x, y] = projection(NOVI_SAD)!; return (
          <g transform={`translate(${x},${y})`} aria-hidden>
            <circle r={3} fill="#efe8d8" />
            <text x={8} y={-8} className="fill-ivory" style={{ font: "500 10px var(--font-mono)", letterSpacing: ".14em" }}>NOVI SAD · THE DESK</text>
          </g>); })()}
        {DOSSIERS.map((d) => {
          if (!visible(d.centroid)) return null;
          const [x, y] = projection(d.centroid)!;
          const isSel = d.id === selected;
          return (
            <g key={d.id} transform={`translate(${x},${y})`} className="cursor-pointer" onClick={() => onSelect(d.id)} aria-hidden>
              {isSel && !reduceMotion && <circle r={6} fill="none" stroke="#efe8d8" className="gt-ping" />}
              <circle r={isSel ? 4.5 : 3} fill={isSel ? "#efe8d8" : "#c4a265"} stroke="#0e0d0b" />
              {d.id !== "rs" && (
                <text x={10} y={4} style={{ font: "500 10px var(--font-mono)", letterSpacing: ".14em" }} className={isSel ? "fill-ivory" : "fill-[#c4a265]"}>
                  {d.country.toUpperCase()} · {relativeDay(d.date).toUpperCase()}
                </text>
              )}
              {d.id === "rs" && (
                <text x={10} y={18} style={{ font: "500 10px var(--font-mono)", letterSpacing: ".14em" }} className={isSel ? "fill-ivory" : "fill-[#c4a265]"}>
                  SERBIA · {relativeDay(d.date).toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center kicker text-mute">Drag to turn the globe · select a country to open its dossier</p>
    </div>
  );
}
