import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Masthead } from "./components/Masthead";
import { Intake } from "./components/Intake";
import { ElectionDesk } from "./components/ElectionDesk";
import { Room } from "./components/Room";
import { CaseOpened } from "./components/CaseOpened";
import { useLiveCase, useReplay } from "./lib/useCase";
import { health, objection, openCase } from "./lib/api";

type View = { kind: "desk" } | { kind: "case"; id: string } | { kind: "demo" };

function readView(): View {
  const p = new URLSearchParams(location.search);
  if (p.get("case")) return { kind: "case", id: p.get("case")! };
  if (p.has("demo")) return { kind: "demo" };
  return { kind: "desk" };
}

export default function App() {
  const [view, setView] = useState<View>(readView);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<{ no: string; claim: string } | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [draftUrl, setDraftUrl] = useState<{ url: string; n: number } | null>(null);
  const autostarted = useRef(false);

  const go = (v: View) => {
    const q = v.kind === "case" ? `?case=${v.id}` : v.kind === "demo" ? "?demo" : "/";
    history.pushState(null, "", q); setView(v); window.scrollTo({ top: 0 });
  };
  useEffect(() => { const f = () => setView(readView()); addEventListener("popstate", f); return () => removeEventListener("popstate", f); }, []);
  useEffect(() => { health().then((h) => { setLive(h ? h.live : false); setOfflineReason(h ? h.providerError ?? (h.live ? null : "The server has no model key configured.") : "The court server is not running (npm run dev)."); }); }, []);

  const liveCase = useLiveCase(view.kind === "case" ? view.id : null);
  const replay = useReplay(view.kind === "demo");

  const open = async (input: { claim?: string; url?: string }) => {
    setBusy(true); setError(null);
    try {
      const c = await openCase(input);
      setOpening({ no: c.id.slice(0, 8).toUpperCase(), claim: c.claim });
      setTimeout(() => setOpening(null), 2200);
      go({ kind: "case", id: c.id });
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  // Arriving from the Chrome extension: ?claim=...&url=...
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const claim = p.get("claim");
    if (claim && !autostarted.current && view.kind === "desk") { autostarted.current = true; open({ claim, url: p.get("url") || undefined }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const demo = () => { setOpening({ no: "RECORDED", claim: "Replaying a real, saved investigation" }); setTimeout(() => setOpening(null), 1800); setReplayKey((k) => k + 1); go({ kind: "demo" }); };

  const c = view.kind === "case" ? liveCase.data : view.kind === "demo" ? replay.data : null;
  const status = view.kind === "case" ? "Live court" : view.kind === "demo" ? "Recorded case" : live ? "Court in session" : live === false ? "Court offline" : "";

  return (
    <div className="min-h-screen overflow-x-clip">
      <Masthead onHome={() => go({ kind: "desk" })} right={status} />
      <AnimatePresence>{opening && <CaseOpened caseNo={opening.no} claim={opening.claim} />}</AnimatePresence>
      {view.kind === "desk" && (
        <>
          <ElectionDesk onInvestigate={open} onDraft={(url) => setDraftUrl({ url, n: Date.now() })} onDemo={demo} busy={busy} live={live} error={error} />
          <Intake onOpen={open} onDemo={demo} busy={busy} error={error} live={live} offlineReason={offlineReason} draftUrl={draftUrl} />
        </>
      )}
      {view.kind !== "desk" && !c && (
        <div className="grid min-h-[50vh] place-items-center px-6 text-center" role="status">
          {view.kind === "demo" && replay.error ? <p className="text-red">{replay.error}</p> : <p className="display text-[24px] italic text-mute animate-pulse">Retrieving the case file…</p>}
        </div>
      )}
      {c && (
        <Room key={view.kind === "demo" ? `demo-${replayKey}` : c.id} c={c} live={view.kind === "case"} lost={liveCase.lost}
          onRestart={view.kind === "demo" ? replay.restart : undefined}
          onObjection={async (a, u) => { if (view.kind === "case") await objection(view.id, a, u); }} />
      )}
      <footer className="border-t border-rule px-4 py-6 text-center kicker text-mute sm:px-8">
        The Ground Truth · Agreement between machines is not proof. Sources are.
      </footer>
    </div>
  );
}
