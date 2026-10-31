import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, type Edge, type Node, Handle, Position, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ExternalLink, X } from "lucide-react";
import { ROLE_META, type Case } from "../lib/types";
import { BEARING } from "./Ledger";

type D = { kind: "claim" | "source" | "evidence"; label: string; sub?: string; color?: string; ref?: string };

function Card({ data }: NodeProps<Node<D>>) {
  const base = "max-w-[240px] px-3 py-2 text-left";
  return (
    <div className={`${base} ${data.kind === "claim" ? "border-2 border-ivory bg-ink" : data.kind === "source" ? "border border-rule bg-char-2" : "border-l-2 bg-char"}`} style={data.kind === "evidence" ? { borderColor: data.color } : undefined}>
      <Handle type="target" position={Position.Left} className="!bg-rule !border-0" />
      <p className="kicker" style={{ color: data.color ?? "var(--color-mute)" }}>{data.sub}</p>
      <p className={`${data.kind === "claim" ? "display text-[16px]" : "text-[12px]"} mt-1 leading-snug text-ivory line-clamp-4`}>{data.label}</p>
      <Handle type="source" position={Position.Right} className="!bg-rule !border-0" />
    </div>
  );
}
const nodeTypes = { card: Card };

/** Sources → exhibits → claim. Every edge corresponds to a verified quotation; nothing is drawn that isn't in the record. */
export function EvidenceBoard({ c }: { c: Case }) {
  const [sel, setSel] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => {
    const used = c.sources.filter((s) => c.evidence.some((e) => e.sourceId === s.id) || s.id === c.articleSourceId);
    const nodes: Node<D>[] = [
      { id: "claim", type: "card", position: { x: 760, y: Math.max(0, (c.evidence.length * 110) / 2 - 40) }, data: { kind: "claim", label: `“${c.claim}”`, sub: "Claim on trial", color: "var(--color-ivory)" } },
      ...used.map((s, i) => ({ id: s.id, type: "card", position: { x: 0, y: i * 150 }, data: { kind: "source" as const, label: s.title, sub: `${s.id} · ${s.publisher}`, ref: s.id } })),
      ...c.evidence.map((e, i) => ({ id: e.id, type: "card", position: { x: 380, y: i * 110 }, data: { kind: "evidence" as const, label: `“${e.quote}”`, sub: `${e.id} · ${BEARING[e.bearing].label} · ${ROLE_META[e.citedBy].short}`, color: BEARING[e.bearing].color, ref: e.id } })),
    ];
    const edges: Edge[] = c.evidence.flatMap((e) => [
      { id: `${e.sourceId}-${e.id}`, source: e.sourceId, target: e.id, style: { stroke: "#4a463e" } },
      { id: `${e.id}-claim`, source: e.id, target: "claim", animated: e.bearing === "undermines", style: { stroke: BEARING[e.bearing].color, strokeWidth: 1.5 } },
    ]);
    return { nodes, edges };
  }, [c]);

  const ev = c.evidence.find((e) => e.id === sel);
  const src = c.sources.find((s) => s.id === (ev?.sourceId ?? sel));

  return (
    <section aria-label="Evidence board" className="relative h-[70vh] min-h-[480px] border border-rule bg-ink">
      {c.evidence.length === 0 ? (
        <div className="grid h-full place-items-center p-6 text-center text-mute"><p>The board fills as verified exhibits enter the ledger.</p></div>
      ) : (
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} onNodeClick={(_, n) => setSel(n.id === "claim" ? null : n.id)} proOptions={{ hideAttribution: true }} colorMode="dark">
          <Background color="#2a2823" gap={28} />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
      {(ev || src) && (
        <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-sm overflow-y-auto border-l border-rule bg-char p-5">
          <button onClick={() => setSel(null)} className="absolute right-3 top-3 text-mute hover:text-ivory" aria-label="Close"><X size={18} /></button>
          <p className="kicker text-gold">{ev ? `Exhibit ${ev.id}` : `Source ${src!.id}`}</p>
          {ev && <blockquote className="display mt-3 text-[19px] leading-snug">“{ev.quote}”</blockquote>}
          {ev && <dl className="mt-4 space-y-2 text-[13px]">
            <div><dt className="kicker text-mute">Bearing</dt><dd style={{ color: BEARING[ev.bearing].color }}>{BEARING[ev.bearing].label}</dd></div>
            <div><dt className="kicker text-mute">Relevance</dt><dd className="text-ivory-dim">{ev.relevance}</dd></div>
            <div><dt className="kicker text-mute">Entered by</dt><dd>{ROLE_META[ev.citedBy].name}, round {ev.round}, {new Date(ev.at).toLocaleTimeString()}</dd></div>
          </dl>}
          {src && <dl className="mt-4 space-y-2 border-t border-rule pt-4 text-[13px]">
            <div><dt className="kicker text-mute">Origin</dt><dd>{src.title}</dd></div>
            <div><dt className="kicker text-mute">Publisher</dt><dd>{src.publisher}</dd></div>
            <div><dt className="kicker text-mute">Dated</dt><dd>{src.published ? `Last updated ${src.published.slice(0, 10)}` : "No date published"} · retrieved {new Date(src.retrievedAt).toLocaleString()}</dd></div>
            <div><dt className="kicker text-mute">Read by</dt><dd>{src.readBy.map((r) => ROLE_META[r].short).join(", ") || "Clerk (submitted exhibit)"}</dd></div>
            <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[12px] text-gold hover:underline">Open original <ExternalLink size={12} /></a>
          </dl>}
        </aside>
      )}
    </section>
  );
}
