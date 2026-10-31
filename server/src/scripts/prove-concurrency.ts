/**
 * Headless proof that the advocates run concurrently on Mozaik.
 * Opens a real case, waits for the verdict, then prints each agent turn's wall-clock window
 * and the peak number of simultaneously open turns.
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), override: true });

const { initializeRuntime, getCase } = await import("../court/runtime.js");
const { CourtState } = await import("../court/state.js");
const { openCase, reportProviderFailure } = await import("../court/court.js");
process.on("unhandledRejection", (r) => { console.error("turn failed:", (r as Error)?.message ?? r); reportProviderFailure(r); });

initializeRuntime({ state: new CourtState() });
const claim = process.argv[2] ?? "The Great Wall of China is visible from space with the naked eye.";
const url = process.argv[4]; // optional article the claim is checked against
const c = await openCase({ claim, url }, { autopilot: true }); // the clerk takes the editor's decisions
console.log(`Case ${c.id} opened: "${claim}"`);

const t0 = c.openedAt;
const done = await new Promise<boolean>((resolve) => {
  const iv = setInterval(() => {
    const k = getCase(c.id)!;
    if (k.phase === "verdict" || k.phase === "failed") { clearInterval(iv); resolve(k.phase === "verdict"); }
  }, 500);
  setTimeout(() => { clearInterval(iv); resolve(false); }, 300_000);
});

await new Promise((r) => setTimeout(r, 4000)); // let the judge's loop emit model.answer and close its turn
const k = getCase(c.id)!;
console.log("\nAgent turns (seconds since case opened):");
for (const t of k.turns) console.log(`  round ${t.round}  ${t.role.padEnd(13)} ${((t.startedAt - t0) / 1000).toFixed(1).padStart(6)}s → ${t.endedAt ? ((t.endedAt - t0) / 1000).toFixed(1) + "s" : "open"}`);
const points = k.turns.flatMap((t) => [[t.startedAt, 1], [t.endedAt ?? Date.now(), -1]] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
let open = 0, peak = 0;
for (const [, d] of points) { open += d; peak = Math.max(peak, open); }
console.log(`\nPeak concurrent agent turns: ${peak}`);
console.log(`Evidence entered (all quotes verified verbatim): ${k.evidence.length} from ${k.sources.length} sources`);
for (const f of k.filings) console.log(`  R${f.round} ${f.role}: ${f.stance} ${f.confidence}%${f.changed ? "  ← CHANGED" : ""}`);
console.log("Stages:", k.phaseLog.map((p) => p.phase).join(" → "));
for (const l of k.leads) console.log(`  ${l.id} [${l.status}] by ${l.by}${l.assignee ? ` → ${l.assignee}` : ""}: ${l.question.slice(0, 90)}`);
for (const r of k.rebuttals) console.log(`  rebuttal ${r.challengeId} by ${r.by}: ${r.concede ? "CONCEDED" : "rebutted"}`);
for (const d of k.decisions) console.log(`  editor: ${d.detail}`);
const v = k.verdicts.at(-1);
console.log(done && v ? `\nVERDICT: ${v.verdict.toUpperCase()} (${v.confidence}%) — ${v.headline}` : `\nNo verdict: ${k.error ?? "timed out"}`);
const out = process.argv[3];
if (out) {
  const { writeFileSync } = await import("node:fs");
  const { publicCase } = await import("../court/types.js");
  writeFileSync(out, JSON.stringify(publicCase(k), null, 2));
  console.log(`Saved case record to ${out}`);
}
process.exit(done ? 0 : 1);
