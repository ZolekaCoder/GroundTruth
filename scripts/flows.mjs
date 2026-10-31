// End-to-end visual flow test of the Night Shift room (recorded Serbia case, no model calls).
import { chromium } from "playwright";
const W = +(process.argv[2] ?? 1440), H = +(process.argv[3] ?? 900), tag = process.argv[4] ?? "flow";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const shot = async (n) => { await page.screenshot({ path: `artifacts/visual-qa/${tag}-${n}.png` }); console.log("shot", n); };
const step = async (name, fn) => { try { await fn(); console.log("PASS", name); } catch (e) { console.log("FAIL", name, String(e).split("\n")[0]); } };

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await step("1 enter the newsroom", async () => { await page.getByText("The election table · pick a country").waitFor(); });
await step("2 open a country dossier", async () => {
  await page.getByRole("button", { name: /Open the Serbia dossier/ }).click({ force: true });
  await page.getByRole("dialog", { name: /Serbia election dossier/ }).waitFor();
  await page.waitForTimeout(1600); await shot("02-dossier");
});
await step("3 replay the genuine recorded case", async () => {
  await page.getByRole("button", { name: "Replay the recorded investigation" }).click();
  await page.getByText("Recorded investigation", { exact: true }).waitFor();
  await page.waitForTimeout(7000); await shot("03-agents-working");
});
await step("4 agents activate and outputs appear (agent file)", async () => {
  await page.getByRole("button", { name: /The Prosecutor: open their file/ }).click();
  await page.getByRole("dialog", { name: /The Prosecutor's file/ }).waitFor();
  await page.waitForTimeout(1600); await shot("04-agent-file");
});
await step("6 return to the room", async () => {
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await page.getByText("Click the map, the case folder, a monitor or the wall").waitFor();
});
await step("7a verdict reached (wall auto-focus)", async () => {
  await page.getByRole("button", { name: /RULING OF THE COURT/i }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500); await shot("05-wall");
});
await step("5 evidence can be inspected", async () => {
  await page.getByRole("button", { name: /Exhibit E1:/ }).click();
  await page.getByRole("dialog", { name: "Exhibit E1" }).waitFor();
  await page.waitForTimeout(1200); await shot("06-evidence");
  await page.keyboard.press("Escape");
});
await step("7b verdict examined and stamped", async () => {
  await page.getByRole("button", { name: /RULING OF THE COURT/i }).click();
  await page.getByRole("dialog", { name: "Ruling of the court" }).waitFor();
  await page.getByRole("button", { name: /Stamp the ruling/ }).click();
  await page.waitForTimeout(1400); await shot("07-verdict-stamped");
});
await step("back to room keeps case state", async () => {
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await page.waitForTimeout(1600);
  await page.getByText(/Evidence wall · \d+ exhibits/).waitFor(); await shot("08-room-after");
});
console.log(JSON.stringify({ errors }));
await browser.close();
