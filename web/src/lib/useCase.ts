import { useEffect, useMemo, useRef, useState } from "react";
import type { Case } from "./types";

/** Live case over Server-Sent Events from the Mozaik court. */
export function useLiveCase(id: string | null) {
  const [data, setData] = useState<Case | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (!id) return;
    setData(null);
    const es = new EventSource(`/api/cases/${id}/stream`);
    es.addEventListener("case", (e) => { setLost(false); setData(JSON.parse((e as MessageEvent).data)); });
    es.onerror = () => setLost(true);
    return () => es.close();
  }, [id]);
  return { data, lost };
}

/**
 * Recorded replay of a real, saved case run. Nothing is generated client-side: we reveal the
 * saved record progressively by its own timestamps, compressed so a 2-minute run plays in ~40s.
 */
export function useReplay(enabled: boolean, speed = 4) {
  const [record, setRecord] = useState<Case | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    fetch("/sample-case.json").then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? r.json() : Promise.reject(new Error("No recorded case is bundled yet. With a funded model key, run `npm run record` to capture a real investigation.")))).then(setRecord).catch((e) => setError(e.message));
  }, [enabled]);
  useEffect(() => {
    if (!record) return;
    start.current = performance.now();
    const timer = setInterval(() => setT(record.openedAt + (performance.now() - start.current) * speed), 100);
    return () => clearInterval(timer);
  }, [record, speed]);

  const data = useMemo<Case | null>(() => {
    if (!record) return null;
    const upTo = <T extends { at: number }>(xs: T[]) => xs.filter((x) => x.at <= t);
    const verdicts = upTo(record.verdicts);
    const filings = upTo(record.filings);
    const turns = record.turns.filter((x) => x.startedAt <= t).map((x) => ({ ...x, endedAt: x.endedAt && x.endedAt <= t ? x.endedAt : undefined }));
    const busy = Object.fromEntries(turns.filter((x) => !x.endedAt).map((x) => [x.role, x.startedAt]));
    const r2 = filings.filter((f) => f.round === 2).length;
    const phase = verdicts.length ? "verdict" : r2 === 3 ? "deliberation" : filings.filter((f) => f.round === 1).length === 3 ? "cross_examination" : "investigation";
    return {
      ...record, phase, round: phase === "investigation" ? 1 : 2, busy, turns, filings, verdicts,
      evidence: upTo(record.evidence), challenges: upTo(record.challenges), activity: upTo(record.activity),
      sources: record.sources.filter((s) => s.retrievedAt <= t),
    } as Case;
  }, [record, t]);
  return { data, error, restart: () => (start.current = performance.now()) };
}
