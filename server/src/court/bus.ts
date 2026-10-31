import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { getCase } from "./runtime.js";
import { publicCase, type Activity, type Case } from "./types.js";

const subscribers = new Map<string, Set<Response>>();
const pending = new Map<string, NodeJS.Timeout>();

export function subscribe(caseId: string, res: Response) {
  if (!subscribers.has(caseId)) subscribers.set(caseId, new Set());
  subscribers.get(caseId)!.add(res);
  return () => subscribers.get(caseId)?.delete(res);
}

/** Coalesce bursts of concurrent agent activity into ~8 snapshots/sec per case. */
export function publish(caseId: string) {
  if (pending.has(caseId)) return;
  pending.set(caseId, setTimeout(() => {
    pending.delete(caseId);
    const c = getCase(caseId);
    if (!c) return;
    const data = `event: case\ndata: ${JSON.stringify(publicCase(c))}\n\n`;
    for (const res of subscribers.get(caseId) ?? []) res.write(data);
  }, 120));
}

export function log(c: Case, role: Activity["role"], kind: Activity["kind"], text: string) {
  c.activity.push({ id: randomUUID(), role, kind, text, at: Date.now() });
  if (c.activity.length > 400) c.activity.splice(0, c.activity.length - 400);
  publish(c.id);
}
