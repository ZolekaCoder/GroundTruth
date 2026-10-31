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
  // decision points: the recording halts at each editor's decision until the viewer continues
  const acknowledged = useRef(new Set<number>());
  const [paused, setPaused] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    fetch("/sample-case.json").then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? r.json() : Promise.reject(new Error("No recorded case is bundled yet. With a funded model key, run `npm run record` to capture a real investigation.")))).then(setRecord).catch((e) => setError(e.message));
  }, [enabled]);
  useEffect(() => {
    if (!record) return;
    start.current = performance.now();
    acknowledged.current = new Set();
    const stops = (record.phaseLog ?? []).map((p, i) => ({ ...p, i })).filter((p) => p.phase === "awaiting_editor");
    const timer = setInterval(() => {
      const raw = record.openedAt + (performance.now() - start.current) * speed;
      const stop = stops.find((p) => !acknowledged.current.has(p.i) && raw >= p.at + 400);
      if (stop) { setPaused(stop.i); setT(stop.at + 400); start.current = performance.now() - (stop.at + 400 - record.openedAt) / speed; return; }
      setPaused(null);
      setT(raw);
    }, 100);
    return () => clearInterval(timer);
  }, [record, speed]);

  const data = useMemo<Case | null>(() => {
    if (!record) return null;
    const upTo = <T extends { at: number }>(xs: T[]) => xs.filter((x) => x.at <= t);
    const verdicts = upTo(record.verdicts);
    const filings = upTo(record.filings);
    const turns = record.turns.filter((x) => x.startedAt <= t).map((x) => ({ ...x, endedAt: x.endedAt && x.endedAt <= t ? x.endedAt : undefined }));
    const busy = Object.fromEntries(turns.filter((x) => !x.endedAt).map((x) => [x.role, x.startedAt]));
    const log = (record.phaseLog ?? []).filter((p) => p.at <= t);
    const last = log.at(-1);
    const phase = last?.phase ?? "investigation";
    // a lead's state at time t: assigned/reported only once those moments have passed
    const leads = (record.leads ?? []).filter((l) => l.at <= t).map((l) => ({
      ...l,
      status: l.reportedAt && l.reportedAt <= t ? l.status : l.assignedAt && l.assignedAt <= t ? "assigned" : "open",
      finding: l.reportedAt && l.reportedAt <= t ? l.finding : undefined,
    })) as Case["leads"];
    return {
      ...record, phase, round: last?.round ?? 1, busy, turns, filings, verdicts, leads,
      rebuttals: upTo(record.rebuttals ?? []), decisions: upTo(record.decisions ?? []), phaseLog: log,
      pending: phase === "awaiting_editor" ? (log.filter((p) => p.phase === "awaiting_editor").length > 1 ? "before_verdict" : "after_investigation") : undefined,
      evidence: upTo(record.evidence), challenges: upTo(record.challenges), activity: upTo(record.activity),
      sources: record.sources.filter((s) => s.retrievedAt <= t),
    } as Case;
  }, [record, t]);
  const resume = () => { if (paused !== null) { acknowledged.current.add(paused); setPaused(null); } };
  return { data, error, t, paused: paused !== null, resume, restart: () => { start.current = performance.now(); acknowledged.current = new Set(); setPaused(null); if (record) setT(record.openedAt); } };
}
