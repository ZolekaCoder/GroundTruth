import { useEffect, useState } from "react";
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
