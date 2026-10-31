// Final LIVE run through the 3D room: real Mozaik agents, real model calls, editor decisions made in the UI.
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
// CDP capture: Playwright's screenshot waits for fonts to settle, which never happens while live
// updates redraw canvas textures under software WebGL.
import { writeFileSync } from "node:fs";
let cdp;
const shot = async (n) => { cdp ??= await page.context().newCDPSession(page); const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }); writeFileSync(`artifacts/visual-qa/50-live-${n}.png`, Buffer.from(data, "base64")); console.log(new Date().toISOString().slice(11, 19), "shot", n); };
const stations = page.getByRole("navigation", { name: "Stations" });
const T = { timeout: 240000 };

const resume = process.argv[2];
let caseId = resume;
if (resume) {
  await page.goto(`http://localhost:5173/?case=${resume}`, { waitUntil: "load" });
  await page.waitForTimeout(12000);
} else {
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.getByRole("button", { name: /Walk into the newsroom/ }).click(T);
  await page.waitForTimeout(4000);
  await stations.getByRole("button", { name: "Table", exact: true }).click({ force: true, ...T });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /Open the Serbia dossier/ }).click({ force: true, ...T });
  await page.getByRole("button", { name: "Put it on trial" }).click(T);
  await page.waitForURL(/case=/, T);
  caseId = new URL(page.url()).searchParams.get("case");
  console.log("LIVE case", caseId);
  await page.waitForTimeout(14000); await shot("01-investigating");
}

// decision 1: assign the agents' leads to two different desks (they then research concurrently)
const memo = page.getByRole("dialog", { name: "Editor's decision" });
await memo.waitFor(T); await page.waitForTimeout(1500); await shot("02-decision-1");
const cards = memo.locator("li").filter({ has: page.getByRole("button", { name: "Investigation", exact: true }) });
const n = await cards.count();
console.log("open leads offered:", n);
if (n >= 1) await cards.nth(0).getByRole("button", { name: "Investigation", exact: true }).click({ force: true });
if (n >= 2) await cards.nth(1).getByRole("button", { name: "Prosecution", exact: true }).click({ force: true });
if (n === 0) { await memo.getByPlaceholder(/final ODIHR report/).fill("What did the ODIHR final report conclude about the 25 October election?"); }
await memo.getByRole("button", { name: /Send/ }).click({ force: true });
await page.waitForTimeout(12000); await shot("03-leads");

// decision 2: send it to the judge
await memo.waitFor(T); await page.waitForTimeout(1500); await shot("04-decision-2");
await memo.getByRole("button", { name: "Send it to the judge" }).click({ force: true });

await page.getByRole("button", { name: "RULING OF THE COURT" }).waitFor(T);
await page.waitForTimeout(4000); await shot("05-wall-verdict");
await page.getByRole("button", { name: "RULING OF THE COURT" }).click({ force: true });
await page.getByRole("button", { name: /Stamp the ruling/ }).click({ force: true });
await page.waitForTimeout(1500); await shot("06-ruling");

const k = await (await fetch(`http://localhost:8787/api/cases/${caseId}`)).json();
console.log(JSON.stringify({
  stages: k.phaseLog.map((p) => p.phase).join(" → "),
  evidence: k.evidence.length, sources: k.sources.length,
  leads: k.leads.map((l) => `${l.id} ${l.status}${l.assignee ? "→" + l.assignee : ""}`),
  rebuttals: k.rebuttals.map((r) => `${r.challengeId}:${r.concede ? "conceded" : "rebutted"}`),
  decisions: k.decisions.map((d) => d.detail),
  verdict: k.verdicts.at(-1) && `${k.verdicts.at(-1).verdict} ${k.verdicts.at(-1).confidence}% — ${k.verdicts.at(-1).headline}`,
  peakTurns: (() => { const pts = k.turns.flatMap((t) => [[t.startedAt, 1], [t.endedAt ?? Date.now(), -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); let o = 0, p = 0; for (const [, d] of pts) { o += d; p = Math.max(p, o); } return p; })(),
  errors: errors.slice(0, 5),
}, null, 2));
await browser.close();
