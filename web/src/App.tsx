import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Masthead } from "./components/Masthead";
import { Room } from "./components/Room";
import { CaseOpened } from "./components/CaseOpened";
import { Scene } from "./night/Scene";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLiveCase } from "./lib/useCase";
import { DOSSIERS } from "./lib/elections";
import { health, objection, openCase } from "./lib/api";

type View = { caseId: string | null; text: boolean };

/** The 3D room needs WebGL; without it (or with ?view=2d) the illustrated 2D room is used. */
const webgl = (() => { try { const cv = document.createElement("canvas"); return !!(cv.getContext("webgl2") || cv.getContext("webgl")); } catch { return false; } })();
const roomMode = (): "2d" | "3d" => (new URLSearchParams(location.search).get("view") === "2d" || !webgl ? "2d" : "3d");

function readView(): View {
  if (new URLSearchParams(location.search).has("demo")) history.replaceState(null, "", "/");
  const p = new URLSearchParams(location.search);
  return { caseId: p.get("case"), text: p.get("view") === "text" };
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
    if (v.text) p.set("view", "text");
    else if (roomMode() === "2d" && webgl) p.set("view", "2d");
    history.pushState(null, "", p.toString() ? `?${p.toString()}` : "/");
    setView(v);
  };
  useEffect(() => { const f = () => setView(readView()); addEventListener("popstate", f); return () => removeEventListener("popstate", f); }, []);
  useEffect(() => { health().then((h) => setLiveCourt(h ? h.live : false)); }, []);

  const live = useLiveCase(view.caseId);
  const c = view.caseId ? live.data : null;

  const open = async (input: { claim?: string; url?: string }) => {
    setBusy(true); setError(null);
    try {
      const k = await openCase(input);
      setOpening({ no: k.id.slice(0, 8).toUpperCase(), claim: k.claim });
      setTimeout(() => setOpening(null), 2200);
      go({ caseId: k.id, text: false });
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

  // the flagship case, opened live: real Mozaik agents, real model calls
  const serbia = () => { const d = DOSSIERS.find((x) => x.id === "rs")!; return open({ claim: d.testClaim.text, url: d.testClaim.url }); };
  const raise = async (a: string, u?: string) => { if (view.caseId) await objection(view.caseId, a, u); };

  if (view.text && c) {
    // Accessible, non-spatial view of the same case: same data, conventional layout.
    return (
      <div className="min-h-screen overflow-x-clip">
        <Masthead onHome={() => go({ ...view, text: false })} right="Live court · text view" />
        <Room c={c} live lost={live.lost} onObjection={raise} />
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary key={view.caseId ?? "room"} onTextView={c ? () => { location.assign(`${location.search}${location.search ? "&" : "?"}view=text`); } : undefined}>
      <Scene mode={roomMode()} c={c} live={!!view.caseId} busy={busy} error={error} liveCourt={liveCourt}
        onOpenCase={open} onSerbia={serbia} onObjection={raise}
        onTextView={() => go({ ...view, text: true })} />
      </ErrorBoundary>
      <AnimatePresence>{opening && <CaseOpened caseNo={opening.no} claim={opening.claim} />}</AnimatePresence>
    </>
  );
}
