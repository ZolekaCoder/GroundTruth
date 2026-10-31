import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ExternalLink, FlaskConical, Loader2, PlayCircle } from "lucide-react";
import { Globe } from "./Globe";
import { DOSSIERS, relativeDay, type Dossier } from "../lib/elections";

const fmt = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function ElectionDesk({ onInvestigate, onDraft, onDemo, busy, live, error }: {
  onInvestigate: (input: { claim: string; url?: string }) => void;
  onDraft: (url: string) => void;
  onDemo: () => void;
  busy: boolean;
  live: boolean | null;
  error?: string | null;
}) {
  const [sel, setSel] = useState<Dossier["id"]>("rs");
  const d = DOSSIERS.find((x) => x.id === sel)!;

  return (
    <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
      <section className="pt-8 sm:pt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
          <p className="kicker text-red">Election Desk 2026</p>
          <p className="kicker text-mute">Filed from Novi Sad, Serbia · JigJoy Mozaik hackathon, 30–31 October 2026</p>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}
          className="display mt-6 max-w-[16ch] text-[clamp(42px,7.4vw,104px)] font-[380] leading-[0.92]">
          Three elections in ten days. <em className="font-[300] text-gold">Cross-examine what you’re told.</em>
        </motion.h1>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <Globe selected={sel} onSelect={setSel} />
          <div role="tablist" aria-label="Election dossiers" className="mt-5 grid grid-cols-3 border border-rule">
            {DOSSIERS.map((x) => (
              <button key={x.id} role="tab" aria-selected={sel === x.id} onClick={() => setSel(x.id)}
                className={`border-r border-rule px-3 py-3 text-left last:border-r-0 transition ${sel === x.id ? "bg-ivory text-ink" : "hover:bg-char"}`}>
                <span className={`kicker block ${sel === x.id ? "text-red" : "text-mute"}`}>{relativeDay(x.date)}</span>
                <span className="display mt-1 block text-[18px] leading-tight">{x.country}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.article key={d.id} role="tabpanel" aria-label={`${d.country} dossier`}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.45 }}
            className="border-t-2 border-ivory pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="kicker text-gold">Dossier · {d.id === "rs" ? "Flagship investigation" : d.country}</p>
              <p className="kicker text-mute">{d.election} · {fmt(d.date)}</p>
            </div>
            <h2 className="display mt-3 text-[clamp(34px,4vw,54px)] font-[500] leading-none">{d.country}</h2>
            <p className="display mt-3 text-[19px] italic leading-snug text-ivory-dim">{d.standfirst}</p>

            <h3 className="kicker mt-7 border-b border-rule pb-2 text-ivory">Verified context: quoted from the record</h3>
            <ul className="divide-y divide-rule">
              {d.context.map((c) => (
                <li key={c.quote} className="py-3">
                  <blockquote className="text-[14.5px] leading-relaxed">“{c.quote}”</blockquote>
                  <a href={c.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11.5px] text-mute hover:text-gold">
                    {c.publisher} · {c.date} <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 border border-rule bg-char p-4">
              <p className="kicker flex items-center gap-2 text-gold"><FlaskConical size={13} /> Synthetic test claim</p>
              <p className="display mt-2 text-[21px] leading-snug">“{d.testClaim.text}”</p>
              <p className="mt-2 text-[12.5px] text-mute">Written by The Ground Truth to test the court. Not a quotation from, or attribution to, any person, party or outlet. {d.testClaim.why}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button disabled={busy || live === false} onClick={() => onInvestigate({ claim: d.testClaim.text, url: d.testClaim.url })}
                  className="group inline-flex items-center gap-3 bg-ivory px-5 py-3 font-semibold text-ink transition hover:bg-gold disabled:opacity-40">
                  {busy && <Loader2 size={16} className="animate-spin" />} Open the investigation <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </button>
                {d.id === "rs" && (
                  <button onClick={onDemo} className="inline-flex items-center gap-2 text-[14px] text-ivory-dim hover:text-ivory"><PlayCircle size={16} /> Watch the recorded investigation</button>
                )}
              </div>
              {live === false && <p role="status" className="mt-3 text-[12.5px] text-gold">The live court is offline, so only the recorded investigation is available.</p>}
              {error && <p role="alert" className="mt-3 text-[13px] text-red">{error}</p>}
            </div>

            <div className="mt-6">
              <h3 className="kicker text-mute">Primary sources</h3>
              <ul className="mt-2 space-y-1.5">
                {d.sources.map((s) => (
                  <li key={s.url} className="flex flex-col gap-0.5 border-b border-rule/60 pb-2 text-[14px] last:border-0">
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-gold">{s.label} <ExternalLink size={12} /></a>
                    <button onClick={() => onDraft(s.url)} className="self-start kicker text-mute hover:text-ivory">Investigate a claim from this source →</button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        </AnimatePresence>
      </section>

      <WhyThisExists />
    </div>
  );
}

function WhyThisExists() {
  return (
    <section aria-labelledby="why" className="mt-24 border-t-[3px] border-double border-rule pt-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="kicker text-red">Why this exists</p>
          <h2 id="why" className="display mt-3 text-[clamp(32px,4vw,52px)] font-[420] leading-[1]">An election is only as free as the information voters can trust.</h2>
        </div>
        <div className="grid gap-8 text-[15.5px] leading-relaxed text-ivory-dim sm:grid-cols-2">
          <p className="dropcap">
            Observers of Serbia’s 25 October vote concluded that media bias and online manipulation{" "}
            <q className="text-ivory">hampered voters’ ability to obtain impartial and reliable information</q>{" "}
            (<a className="underline hover:text-gold" href="https://odihr.osce.org/node/666908" target="_blank" rel="noreferrer">OSCE/ODIHR</a>).
            South Africa’s Electoral Commission now requires parties to{" "}
            <q className="text-ivory">Label AI-generated (“synthetic”) content clearly before distributing it</q>{" "}
            (<a className="underline hover:text-gold" href="https://www.gov.za/news/media-statements/electoral-commission-introduces-new-disinformation-code-ahead-2026-local" target="_blank" rel="noreferrer">gov.za</a>).
          </p>
          <div className="space-y-4">
            <p>Most misinformation isn’t invented from nothing. It is a real sentence with its second half removed, an institution given a power it doesn’t have, or a rule described as broader than it is. Fact-checks arrive late; framing travels fast.</p>
            <p>The Ground Truth lets anyone put a claim on trial in minutes. It shows every quotation, where it came from and when, what remains uncertain, and whether a dispute is about <span className="text-ivory">facts</span> or about <span className="text-ivory">framing</span>. It never tells you an answer is true because several AIs agree.</p>
          </div>
          <ul className="grid gap-px border border-rule bg-rule sm:col-span-2 sm:grid-cols-3">
            {[
              ["Provenance", "Every exhibit links to its original source, publisher and date, and was verified word for word."],
              ["Uncertainty", "Verdicts state what remains unknown. “Insufficient evidence” is an honest answer."],
              ["Fact vs framing", "Selective quotation and omitted context are named separately from factual error."],
            ].map(([k, v]) => (
              <li key={k} className="bg-ink p-4"><p className="kicker text-gold">{k}</p><p className="mt-2 text-[14px]">{v}</p></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
