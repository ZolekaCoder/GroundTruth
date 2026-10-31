import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, FileText, Radio, RotateCcw } from "lucide-react";
import type { Advocate, Case } from "../lib/types";
import type { Dossier } from "../lib/elections";
import { findTestClaim } from "../lib/elections";
import { ArchiveShelves, BackWall, Chairs, CityWindow, Floor, Lightmap, Plant, STAGE, TableTop, WallClock } from "./room";
import { Newsroom } from "./People";
import { decide, type EditorDecision } from "../lib/api";
import { CaseFolder, DeskNote, ElectionMap, NightEdition } from "./TableProps";
import { Workstation } from "./Workstation";
import { EvidenceWall } from "./EvidenceWall";
// The 3D room is code-split: the 2D room never downloads three.js.
const Newsroom3D = lazy(() => import("../room3d/Newsroom3D"));
import { AgentFile, CaseSheet, DossierFolder, EditorMemo, EvidenceSheet, SourceSheet, VerdictSheet } from "./Papers";

export type Focus = "overview" | "table" | "desk" | "wall" | Advocate;
type Overlay = null | { kind: "editor" } | { kind: "dossier"; id: Dossier["id"] } | { kind: "case" } | { kind: "agent"; role: Advocate } | { kind: "evidence"; id: string } | { kind: "source"; id: string } | { kind: "verdict" };

const CAMERA: Record<Focus, { cx: number; cy: number; z: number; label: string }> = {
  overview: { cx: 800, cy: 450, z: 1, label: "The newsroom" },
  table: { cx: 810, cy: 640, z: 2.1, label: "The election table" },
  desk: { cx: 1090, cy: 665, z: 2.6, label: "The case desk" },
  wall: { cx: 650, cy: 236, z: 1.95, label: "The evidence wall" },
  prosecutor: { cx: 190, cy: 720, z: 1.75, label: "Prosecution desk" },
  defender: { cx: 1410, cy: 720, z: 1.75, label: "Defence desk" },
  investigator: { cx: 330, cy: 525, z: 2.7, label: "Investigation desk" },
};

const reduceMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Scene({ mode = "2d", c, live, recorded, busy, error, liveCourt, onOpenCase, onDemo, onObjection, onRestartReplay, onTextView, replayT, replayPaused, onResume }: {
  mode?: "2d" | "3d";
  c: Case | null; live: boolean; recorded: boolean; busy: boolean; error: string | null; liveCourt: boolean | null;
  replayT?: number; replayPaused?: boolean; onResume?: () => void;
  onOpenCase: (input: { claim?: string; url?: string }) => Promise<boolean>; onDemo: () => void;
  onObjection: (arg: string, url?: string) => Promise<void>; onRestartReplay?: () => void; onTextView?: () => void;
}) {
  const [focus, setFocus] = useState<Focus>("overview");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight });
  const [px, setPx] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const verdictCount = useRef(c?.verdicts.length ?? 0);
  // the room's clock: real time for a live case, the replay's own clock for a recording
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { if (!live) return; const iv = setInterval(() => setTick(Date.now()), 400); return () => clearInterval(iv); }, [live]);
  const now = recorded ? replayT ?? 0 : tick;
  // the editor's decision points: walk to the wall and put the memo on the desk
  const pauseKey = c?.phase === "awaiting_editor" ? `${c.id}:${c.phaseLog.filter((p) => p.phase === "awaiting_editor").length}` : null;
  useEffect(() => {
    if (!pauseKey) return;
    setFocus("wall"); setOverlay({ kind: "editor" });
    setToast("Your call, editor.");
  }, [pauseKey]);

  useLayoutEffect(() => { const f = () => setVp({ w: innerWidth, h: innerHeight }); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  const back = useCallback(() => { setOverlay(null); setFocus("overview"); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") overlay ? setOverlay(null) : back(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [overlay, back]);

  // the ruling arrives: tell the editor, and walk them to the wall if they're standing back
  useEffect(() => {
    const n = c?.verdicts.length ?? 0;
    if (n > verdictCount.current) {
      setToast("The ruling is pinned to the evidence wall.");
      if (focus === "overview") setTimeout(() => { setFocus("wall"); }, 900);
    }
    verdictCount.current = n;
  }, [c?.verdicts.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5200); return () => clearTimeout(t); }, [toast]);

  const go = (f: Focus, o: Overlay = null) => { setFocus(f); setOverlay(o); };

  // camera: one transform for the whole world, anchored left of any open document
  const cam = CAMERA[focus];
  const base = Math.max(vp.w / STAGE.w, vp.h / STAGE.h);
  const s = base * cam.z;
  const wide = vp.w >= 1100;
  const sheetW = overlay ? Math.min(overlay.kind === "dossier" ? 860 : overlay.kind === "verdict" ? 760 : 640, vp.w * 0.55) : 0;
  const anchorX = overlay && wide ? (vp.w - sheetW - 48) / 2 : vp.w / 2;
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const tx = clamp(anchorX - cam.cx * s, vp.w - STAGE.w * s, 0);
  const ty = clamp(vp.h / 2 - cam.cy * s, vp.h - STAGE.h * s, 0);
  const parallax = !reduceMotion && focus === "overview";
  // layer containers never take clicks themselves; only the objects inside them do
  const layer = (depth: number): React.CSSProperties => ({ pointerEvents: "none", ...(parallax ? { transform: `translate(${px.x * depth}px, ${px.y * depth * 0.6}px)`, transition: "transform .6s ease-out" } : {}) });

  const openCase = async (input: { claim?: string; url?: string }) => {
    if (await onOpenCase(input)) { go("overview"); setToast("Case opened. Three desks are working at once: click a monitor to read along, or watch the wall."); }
  };
  const synthetic = c ? findTestClaim(c.claim) : undefined;
  const working = c ? Object.keys(c.busy).length : 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e9e1d2]" onPointerMove={(e) => parallax && setPx({ x: (e.clientX / vp.w - 0.5) * 2, y: (e.clientY / vp.h - 0.5) * 2 })}>
      {mode === "3d" ? (
        <Suspense fallback={<div className="grid h-full place-items-center bg-[#e9e1d2]"><p className="hint text-[#3d2a1a]">Opening the newsroom…</p></div>}>
          <Newsroom3D c={c} now={now} focus={focus} sheetOpen={!!overlay}
            onFocus={(f) => go(f)}
            onPin={(id) => go("table", { kind: "dossier", id })}
            onCaseFolder={() => go("desk", { kind: "case" })}
            onAgent={(r) => go(r, { kind: "agent", role: r })}
            onEvidence={(id) => go("wall", { kind: "evidence", id })}
            onVerdict={() => go("wall", { kind: "verdict" })}
            onSource={(id) => go("wall", { kind: "source", id })} />
        </Suspense>
      ) : (
      <>
      <div className="world absolute left-0 top-0" data-focus={focus} style={{ width: STAGE.w, height: STAGE.h, transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        {/* background */}
        <div className="absolute inset-0" style={layer(-5)}>
          <BackWall />
          <CityWindow />
          <ArchiveShelves />
          <WallClock x={812} y={-4} />
          <Floor />
          <Plant x={1450} y={300} s={0.82} />
        </div>
        {/* the evidence wall */}
        <div className="absolute inset-0" style={layer(-3)}>
          <EvidenceWall c={c} focused={focus === "wall"} onFocus={() => go("wall")}
            onEvidence={(id) => setOverlay({ kind: "evidence", id })} onVerdict={() => setOverlay({ kind: "verdict" })}
            onAgent={(r) => go(r, { kind: "agent", role: r })} onSource={(id) => setOverlay({ kind: "source", id })} />
        </div>
        {/* middle: the table (lit by the lightmap) */}
        <div className="absolute inset-0" style={layer(2)}>
          <div className="station absolute inset-0" data-active={focus === "table" || focus === "desk" || undefined} style={{ pointerEvents: "none" }}>
            <TableTop>
              <div className="absolute inset-0" style={{ pointerEvents: "auto", clipPath: "polygon(470px 598px, 1130px 598px, 1236px 732px, 364px 732px)", cursor: focus === "table" ? "default" : "zoom-in" }}
                onClick={() => focus !== "table" && go("table")} aria-hidden />
              <NightEdition c={c} />
              <ElectionMap interactive showLabels={focus === "table"} selected={overlay?.kind === "dossier" ? overlay.id : null} onPick={(id) => go("table", { kind: "dossier", id })} />
              <DeskNote />
              <CaseFolder c={c} interactive onOpen={() => go("desk", { kind: "case" })} />
            </TableTop>
          </div>
        </div>
        <Lightmap />
        {/* emitters sit above the lightmap: lamps and the investigator's screen */}
        <div className="absolute inset-0" style={layer(2)}>
          <Workstation role="investigator" c={c} active={focus === "investigator"} onOpen={() => go("investigator", { kind: "agent", role: "investigator" })} />
        </div>
        {/* foreground desks, cropped by the frame */}
        <div className="absolute inset-0" style={layer(9)}>
          <div className="station absolute inset-0"><Chairs /></div>
          <Newsroom c={c} now={now} />
          <Workstation role="prosecutor" c={c} active={focus === "prosecutor"} onOpen={() => go("prosecutor", { kind: "agent", role: "prosecutor" })} />
          <Workstation role="defender" c={c} active={focus === "defender"} onOpen={() => go("defender", { kind: "agent", role: "defender" })} />
        </div>

        {/* invitations, in the room itself, only when standing back */}
        <AnimatePresence>
          {focus === "overview" && vp.w >= 700 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6 }} className="pointer-events-none absolute inset-0">
              <Tag x={800} y={548} text="The election table · pick a country" />
              <Tag x={650} y={34} text={c ? `Evidence wall · ${c.evidence.length} exhibits` : "The evidence wall"} />
              <Tag x={1110} y={612} text={c ? "Case file" : "Open your own case"} small />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* lens: vignette and warm grade, in screen space */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(130% 100% at 55% 45%, transparent 62%, rgba(60,40,22,.28) 100%)" }} />

      </>
      )}
      {/* HUD: small, at the edges */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="pointer-events-auto">
          <div className="inline-block bg-[#1b1611]/85 px-3 py-2" style={{ boxShadow: "0 4px 12px rgba(0,0,0,.25)" }}>
            <p className="whitespace-nowrap font-serif text-[17px] font-semibold leading-none text-paper sm:text-[19px]">The Ground Truth</p>
            <p className="typed mt-1 hidden text-[11px] text-paper/70 sm:block">Election desk · {cam.label}</p>
          </div>
          {focus !== "overview" && (
            <button onClick={back} className="hint mt-2 flex items-center gap-1.5 rounded-full bg-[#1b1611]/85 px-3 py-1.5 text-paper hover:bg-[#2b241c]">
              <ArrowLeft size={14} /> Back to the room <span className="typed text-paper/50">Esc</span>
            </button>
          )}
        </div>
        <div className="pointer-events-auto flex max-w-[60vw] flex-col items-end gap-2">
          {recorded ? (
            <div className="hint flex flex-wrap items-center justify-end gap-2 bg-[#e8dcbf] px-3 py-1.5 text-[#2b241c]" style={{ boxShadow: "0 4px 10px rgba(0,0,0,.4)" }}>
              <strong className="font-semibold">Recorded investigation</strong>
              <span className="typed hidden text-[11px] sm:inline">a real run, {c ? new Date(c.openedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""} · {replayPaused ? "paused at a decision" : "replayed 4×"}{c?.autopilot ? " · editor decisions by test autopilot" : ""}</span>
              {onRestartReplay && <button onClick={onRestartReplay} className="inline-flex items-center gap-1 underline"><RotateCcw size={12} /> Replay</button>}
            </div>
          ) : c ? (
            <div className="hint flex items-center gap-2 rounded-full bg-[#1b1611]/85 px-3 py-1.5 text-paper">
              {c.phase !== "verdict" && c.phase !== "failed" && <Radio size={13} className="animate-pulse text-[#e6a95c]" />}
              Live case · {c.phase === "awaiting_editor" ? "waiting for your decision" : c.phase.replace("_", "-")}{working ? ` · ${working} agents working` : ""}
            </div>
          ) : (
            <div className="hint rounded-full bg-[#1b1611]/85 px-3 py-1.5 text-paper/80">{liveCourt === false ? "Court offline · recordings only" : "Court in session"}</div>
          )}
          {synthetic && <div className="hint bg-[#1b1611]/85 px-3 py-1 text-[#e6c48f]">Synthetic test claim<span className="hidden sm:inline"> ({synthetic.country} dossier), not attributed to anyone</span></div>}
          <a href={(() => { const p = new URLSearchParams(location.search); if (mode === "3d") p.set("view", "2d"); else p.delete("view"); const q = p.toString().replace("demo=", "demo"); return q ? `?${q}` : "/"; })()} className="hint hidden text-paper/80 underline-offset-2 hover:underline sm:inline">{mode === "3d" ? "2D view" : "3D view"}</a>
          {c && onTextView && <button onClick={onTextView} className="hint hidden sm:inline-flex items-center gap-1.5 text-paper/70 underline-offset-2 hover:text-paper hover:underline"><FileText size={13} /> Text view of this case</button>}
        </div>
      </header>

      <AnimatePresence>
        {toast && (
          <motion.p role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="hint absolute bottom-16 left-1/2 max-w-[90vw] -translate-x-1/2 bg-[#e8dcbf] px-4 py-2 text-center text-[13px] text-[#2b241c]" style={{ boxShadow: "0 6px 16px rgba(0,0,0,.45)" }}>
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
      {!overlay && c?.phase === "awaiting_editor" && (
        <button onClick={() => { setFocus("wall"); setOverlay({ kind: "editor" }); }} className="hint absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-[#a3302a] px-4 py-2 text-white shadow-lg">Your call, editor: open the memo</button>
      )}
      {!overlay && (
        <p className="hint pointer-events-none absolute bottom-4 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-[#1b1611]/60 px-3 py-1 text-center text-paper/90">
          {c?.phase === "awaiting_editor" ? "The desks are waiting on you" : focus === "overview" ? "Click the map, the case folder, a monitor or the wall" : focus === "wall" ? "Open any pinned document · the ruling appears here when it's ready" : focus === "table" ? "Choose a brass pin to open that election’s dossier" : "Esc returns to the room"}
        </p>
      )}

      {/* narrow screens can't show the whole room, so the stations get a small strip */}
      {(vp.w < 700 || mode === "3d") && !overlay && (
        <nav aria-label="Stations" className={`absolute flex justify-between gap-1 rounded-sm bg-[#1b1611]/90 p-1 ${vp.w < 700 ? "inset-x-2 bottom-10" : "bottom-14 left-4"}`}>
          {([["overview", "Room"], ["table", "Table"], ["wall", "Wall"], ["investigator", "Invest."], ["prosecutor", "Prosec."], ["defender", "Defence"]] as [Focus, string][]).filter(([f]) => f !== "overview" || mode === "3d").map(([f, l]) => (
            <button key={f} onClick={() => go(f, f === "table" || f === "wall" || f === "overview" ? null : { kind: "agent", role: f as Advocate })} className={`hint flex-1 rounded-sm px-1 py-1.5 text-[11.5px] ${focus === f ? "bg-[#e8dcbf] text-[#2b241c]" : "text-paper/80"}`}>{l}</button>
          ))}
        </nav>
      )}
      {mode === "3d" && focus === "wall" && !overlay && c && (c.evidence.length > 0 || c.verdicts.length > 0) && (
        <nav aria-label="Exhibits on the wall" className="absolute bottom-24 left-1/2 flex max-w-[92vw] -translate-x-1/2 flex-wrap justify-center gap-1 rounded-sm bg-[#1b1611]/85 p-1">
          {c.evidence.map((e) => <button key={e.id} onClick={() => setOverlay({ kind: "evidence", id: e.id })} aria-label={`Exhibit ${e.id}: ${e.quote}`} className="typed rounded-sm px-2 py-1 text-[12px] text-paper hover:bg-paper hover:text-[#2b241c]">{e.id}</button>)}
          {c.verdicts.length > 0 && <button onClick={() => setOverlay({ kind: "verdict" })} aria-label="RULING OF THE COURT" className="typed rounded-sm bg-[#a3302a] px-2 py-1 text-[12px] text-white">Ruling</button>}
        </nav>
      )}
      {/* documents */}
      <div className={`pointer-events-none absolute inset-0 flex items-center p-4 ${wide ? "justify-end pr-8" : "justify-center"}`}>
        <AnimatePresence mode="wait">
          {overlay?.kind === "editor" && c && c.phase === "awaiting_editor" && (
            <EditorMemo key={`ed-${pauseKey}`} c={c} live={live} onClose={() => setOverlay(null)}
              onContinue={() => { onResume?.(); setOverlay(null); setFocus("overview"); }}
              onDecide={async (d: EditorDecision) => { await decide(c.id, d); setOverlay(null); setFocus("overview"); setToast(d.action === "call_judge" ? "Sent to the judge." : d.action === "proceed" ? "Straight to cross-examination." : "The desks are on it."); }} />
          )}
          {overlay?.kind === "dossier" && <DossierFolder key={`d-${overlay.id}`} id={overlay.id} busy={busy} live={liveCourt} error={error} onClose={() => setOverlay(null)} onOpenCase={openCase} onDemo={() => { onDemo(); go("overview"); }} />}
          {overlay?.kind === "case" && <CaseSheet key="case" c={c} busy={busy} live={liveCourt} error={error} onClose={() => setOverlay(null)} onOpenCase={openCase} />}
          {overlay?.kind === "agent" && <AgentFile key={`a-${overlay.role}`} role={overlay.role} c={c} onClose={() => setOverlay(null)} onEvidence={(id) => go("wall", { kind: "evidence", id })} />}
          {overlay?.kind === "evidence" && c && <EvidenceSheet key={`e-${overlay.id}`} id={overlay.id} c={c} onClose={() => setOverlay(null)} />}
          {overlay?.kind === "source" && c && <SourceSheet key={`s-${overlay.id}`} id={overlay.id} c={c} onClose={() => setOverlay(null)} />}
          {overlay?.kind === "verdict" && c?.verdicts.length && <VerdictSheet key="v" c={c} live={live} onClose={() => setOverlay(null)} onObjection={async (a, u) => { await onObjection(a, u); go("overview"); setToast("Objection filed. The desks are reconsidering."); }} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Tag({ x, y, text, small }: { x: number; y: number; text: string; small?: boolean }) {
  return (
    <div className="absolute flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1b1611]/80 px-2 py-0.5 text-paper" style={{ left: x, top: y, fontSize: small ? 9 : 10.5, fontFamily: "var(--font-sans)" }}>
      <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e6a95c] opacity-70" /><span className="relative inline-flex size-1.5 rounded-full bg-[#e6a95c]" /></span>
      {text}
    </div>
  );
}
