// Journey test for the 3D room on the recorded case (no model calls). Software WebGL: generous waits.
import { chromium } from "playwright";
const tag = process.argv[2] ?? "3d-flow";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const shot = async (n) => { await page.screenshot({ path: `artifacts/visual-qa/${tag}-${n}.png` }); console.log("shot", n); };
const step = async (name, fn) => { try { await fn(); console.log("PASS", name); } catch (e) { console.log("FAIL", name, String(e).split("\n")[0]); } };
const stations = page.getByRole("navigation", { name: "Stations" });

await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForTimeout(14000);
await step("0 the opening screen", async () => {
  await page.getByRole("dialog", { name: "The Ground Truth: Election Desk" }).waitFor(); await shot("00-intro");
  await page.getByRole("button", { name: "Enter the newsroom" }).click(); await page.waitForTimeout(2500);
});
await step("1 enter the 3D newsroom", async () => { await stations.waitFor(); await shot("01-overview"); });
await step("2 table → Serbia dossier", async () => {
  await stations.getByRole("button", { name: "Table", exact: true }).click();
  await page.waitForTimeout(3500); await shot("02-table");
  await page.getByRole("button", { name: /Open the Serbia dossier/ }).click();
  await page.getByRole("dialog", { name: /Serbia election dossier/ }).waitFor();
  await page.waitForTimeout(2500); await shot("03-dossier");
});
await step("3 replay the recorded case", async () => {
  await page.getByRole("button", { name: "Replay the recorded investigation" }).click();
  await page.getByText("Recorded investigation", { exact: true }).waitFor();
  await page.waitForTimeout(5000); await shot("04-agents-working");
});
await step("4 editor decision 1", async () => {
  await page.getByRole("dialog", { name: "Editor's decision" }).waitFor({ timeout: 45000 });
  await page.waitForTimeout(2500); await shot("05-decision");
  await page.getByRole("button", { name: "Continue the recording" }).click();
  await page.waitForTimeout(3000);
});
await step("6 editor decision 2", async () => {
  await page.getByRole("dialog", { name: "Editor's decision" }).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Continue the recording" }).click();
});
await step("7 verdict reached; the wall", async () => {
  await page.getByRole("button", { name: "RULING OF THE COURT" }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(3500); await shot("08-wall");
});
await step("8 inspect an exhibit", async () => {
  await page.getByRole("button", { name: /Exhibit E1:/ }).click();
  await page.getByRole("dialog", { name: "Exhibit E1" }).waitFor();
  await page.waitForTimeout(2500); await shot("09-exhibit"); await page.keyboard.press("Escape");
});
await step("9 stamp the ruling", async () => {
  await page.getByRole("button", { name: "RULING OF THE COURT" }).click();
  await page.getByRole("button", { name: /Stamp the ruling/ }).click();
  await page.waitForTimeout(1500); await shot("10-ruling");
});
await step("5 an agent's desk and file", async () => {
  await page.keyboard.press("Escape"); await page.waitForTimeout(2500);
  await stations.getByRole("button", { name: "Prosec.", exact: true }).click({ force: true, timeout: 120000 }); // verified on top via elementFromPoint; software WebGL starves the main thread
  await page.getByRole("dialog", { name: /The Prosecutor's file/ }).waitFor();
  await page.waitForTimeout(3000); await shot("06-agent-desk");
  await page.keyboard.press("Escape"); await page.waitForTimeout(2500); await shot("07-desk-close-up");
  await page.keyboard.press("Escape");
});
await step("10 back to the room, case intact", async () => {
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await page.waitForTimeout(3500); await shot("11-room-after");
});
console.log(JSON.stringify({ errors: errors.slice(0, 8) }));
await browser.close();
