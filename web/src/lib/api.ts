import type { Case } from "./types";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

export const openCase = (input: { claim?: string; url?: string }) => post<Case>("/api/cases", input);
export const objection = (id: string, argument: string, url?: string) => post<Case>(`/api/cases/${id}/objection`, { argument, url });
export const health = () => fetch("/api/health").then((r) => r.json() as Promise<{ ok: boolean; live: boolean; model: string; providerError?: string | null }>).catch(() => null);
