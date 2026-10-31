import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Masthead } from "./components/Masthead";
import { Room } from "./components/Room";
import { CaseOpened } from "./components/CaseOpened";
import { Scene } from "./night/Scene";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLiveCase, useReplay } from "./lib/useCase";
import { health, objection, openCase } from "./lib/api";

type View = { caseId: string | null; demo: boolean; text: boolean };

/** The 3D room needs WebGL; without it (or with ?view=2d) the illustrated 2D room is used. */
const webgl = (() => { try { const cv = document.createElement("canvas"); return !!(cv.getContext("webgl2") || cv.getContext("webgl")); } catch { return false; } })();
const roomMode = (): "2d" | "3d" => (new URLSearchParams(location.search).get("view") === "2d" || !webgl ? "2d" : "3d");

function readView(): View {
  const p = new URLSearchParams(location.search);
  return { caseId: p.get("case"), demo: p.has("demo"), text: p.get("view") === "text" };
}

export default function App() {
  const [view, setView] = useState<View>(readView);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<{ no: string; claim: string } | null>(null);
  const [liveCourt, setLiveCourt] = useState<boolean | null>(null);
  const autostarted = useRef(false);

  const go = (v: View) => {
    const p = new URLSearchParams();
    if (v.caseId) p.set("case", v.caseId);
    if (v.demo) p.set("demo", "");
    if (v.text) p.set("view", "text");
    else if (roomMode() === "2d" && webgl) p.set("view", "2d");
    history.pushState(null, "", p.toString() ? `?${p.toString().replace("demo=", "demo")}` : "/");
    setView(v);
  };
  useEffect(() => { const f = () => setView(readView()); addEventListener("popstate", f); return () => removeEventListener("popstate", f); }, []);
  useEffect(() => { health().then((h) => setLiveCourt(h ? h.live : false)); }, []);

  const live = useLiveCase(view.caseId);
  // ?speed=1 replays in real time (presenting); the default compresses a run 4×
  const replay = useReplay(view.demo, Math.min(8, Math.max(0.5, Number(new URLSearchParams(location.search).get("speed")) || 4)));
  const c = view.caseId ? live.data : view.demo ? replay.data : null;

  const open = async (input: { claim?: string; url?: string }) => {
    setBusy(true); setError(null);
    try {
      const k = await openCase(input);
      setOpening({ no: k.id.slice(0, 8).toUpperCase(), claim: k.claim });
      setTimeout(() => setOpening(null), 2200);
      go({ caseId: k.id, demo: false, text: false });
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally { setBusy(false); }
  };

  // Arriving from the Chrome extension: ?claim=...&url=...
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const claim = p.get("claim");
    if (claim && !autostarted.current) { autostarted.current = true; open({ claim, url: p.get("url") || undefined }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const demo = () => {
    setOpening({ no: "RECORDED", claim: "Replaying a real, saved investigation" });
    setTimeout(() => setOpening(null), 1800);
    go({ caseId: null, demo: true, text: false });
    replay.restart();
  };
  const raise = async (a: string, u?: string) => { if (view.caseId) await objection(view.caseId, a, u); };

  if (view.text && c) {
    // Accessible, non-spatial view of the same case: same data, conventional layout.
    return (
      <div className="min-h-screen overflow-x-clip">
        <Masthead onHome={() => go({ ...view, text: false })} right={view.demo ? "Recorded case · text view" : "Live court · text view"} />
        <Room c={c} live={!!view.caseId} lost={live.lost} onRestart={view.demo ? replay.restart : undefined} onObjection={raise} />
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary key={view.caseId ?? (view.demo ? "demo" : "room")} onTextView={c ? () => { location.assign(`${location.search}${location.search ? "&" : "?"}view=text`); } : undefined}>
      <Scene mode={roomMode()} c={c} live={!!view.caseId} recorded={view.demo} busy={busy} error={error ?? (view.demo ? replay.error : null)} liveCourt={liveCourt}
        onOpenCase={open} onDemo={demo} onObjection={raise}
        onRestartReplay={view.demo ? replay.restart : undefined}
        replayT={replay.t} replayPaused={replay.paused} onResume={replay.resume}
        onTextView={() => go({ ...view, text: true })} />
      </ErrorBoundary>
      <AnimatePresence>{opening && <CaseOpened caseNo={opening.no} claim={opening.claim} />}</AnimatePresence>
    </>
  );
}
