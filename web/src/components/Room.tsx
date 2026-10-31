import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FlaskConical, Gavel, Radio, RotateCcw, WifiOff } from "lucide-react";
import { findTestClaim } from "../lib/elections";
import { ADVOCATES, ROLE_META, type Case } from "../lib/types";
import { AgentColumn } from "./AgentColumn";
import { Timeline } from "./Timeline";
import { PhaseRail } from "./PhaseRail";
import { Disagreements, Ledger } from "./Ledger";
import { ObjectionForm, VerdictReveal } from "./Verdict";
import { EvidenceBoard } from "./EvidenceBoard";

export function Room({ c, live, lost, onObjection, onRestart }: { c: Case; live: boolean; lost?: boolean; onObjection: (a: string, u?: string) => Promise<void>; onRestart?: () => void }) {
  const [tab, setTab] = useState<"room" | "board">("room");
  const [focus, setFocus] = useState<string | null>(null);
  const verdict = c.verdicts.at(-1);
  const previous = c.verdicts.at(-2);
  const showEvidence = (id: string) => { setTab("room"); setFocus(id); setTimeout(() => document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
  const article = c.sources.find((s) => s.id === c.articleSourceId);
  const synthetic = findTestClaim(c.claim);

  return (
    <main className="mx-auto max-w-[1380px] px-4 pb-24 sm:px-8">
      {lost && live && <div className="mt-4 flex items-center gap-2 border border-red/60 px-4 py-2 text-[13px] text-red" role="alert"><WifiOff size={14} /> Connection to the court lost. Reconnecting…</div>}

      <section className="grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="kicker flex items-center gap-2 text-mute">
            {live && c.phase !== "verdict" && c.phase !== "failed" && <Radio size={12} className="animate-pulse text-red" />}
            Docket {c.id.slice(0, 8).toUpperCase()} · opened {new Date(c.openedAt).toLocaleTimeString()}
            {article && <> · from <a href={article.url} target="_blank" rel="noreferrer" className="underline hover:text-ivory">{article.publisher}</a></>}
          </p>
          {synthetic && (
            <p className="mt-3 inline-flex items-center gap-2 border border-gold/60 px-2 py-1 text-[12px] text-gold">
              <FlaskConical size={13} /> Synthetic test claim from the {synthetic.country} dossier. Written by The Ground Truth, not attributed to anyone.
            </p>
          )}
          <h1 className="display mt-3 max-w-[30ch] text-[clamp(30px,4.4vw,58px)] font-[420] leading-[1.02]">“{c.claim}”</h1>
        </div>
        <div role="tablist" className="flex border border-rule">
          {(["room", "board"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-4 py-2 kicker ${tab === t ? "bg-ivory text-ink" : "text-ivory-dim hover:text-ivory"}`}>
              {t === "room" ? "Investigation room" : `Evidence board (${c.evidence.length})`}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6"><PhaseRail c={c} /></div>

      {c.phase === "failed" && <p role="alert" className="mt-6 border border-red p-4 text-red">{c.error}</p>}

      <AnimatePresence mode="wait">
        {tab === "board" ? (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6"><EvidenceBoard c={c} /></motion.div>
        ) : (
          <motion.div key="room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {ADVOCATES.map((r, i) => (
                <motion.div key={r} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i, duration: 0.6 }}>
                  <AgentColumn c={c} role={r} onEvidence={showEvidence} />
                </motion.div>
              ))}
            </div>

            <div className="mt-10"><Timeline c={c} live={live} /></div>

            {c.phase === "deliberation" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 flex items-center gap-4 border-y border-rule py-6" role="status">
                <motion.span animate={{ rotate: [0, -18, 0] }} transition={{ duration: 1.4, repeat: Infinity }}><Gavel className="text-ivory" /></motion.span>
                <p className="display text-[24px] italic">{ROLE_META.judge.name} is weighing {c.evidence.length} exhibits and {c.filings.length} filings.</p>
              </motion.div>
            )}

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
              <Ledger c={c} focus={focus} />
              <Disagreements c={c} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {verdict && (
        <div className="mt-14 -mx-4 sm:-mx-8">
          <VerdictReveal key={verdict.round} c={c} v={verdict} previous={previous} />
        </div>
      )}
      {verdict && c.phase === "verdict" && (
        <div className="mx-auto mt-12 max-w-3xl"><ObjectionForm onSubmit={onObjection} disabled={!live} /></div>
      )}
    </main>
  );
}
