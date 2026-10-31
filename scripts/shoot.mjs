// Visual QA: screenshot the running app with system Chrome and report console errors.
// usage: node scripts/shoot.mjs <name> <path> [width] [height] [waitMs] [clickSelectors...]
import { chromium } from "playwright";
const [name, path = "/", w = "1440", h = "900", wait = "2500", ...clicks] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
await page.goto(`http://localhost:5173${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(+wait);
for (const sel of clicks) {
  if (/^\d+$/.test(sel)) { await page.waitForTimeout(+sel); continue; }
  await page.locator(sel).first().click();
  await page.waitForTimeout(1600);
}
await page.screenshot({ path: `artifacts/visual-qa/${name}.png` });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log(JSON.stringify({ name, errors, horizontalOverflow: overflow }));
await browser.close();
