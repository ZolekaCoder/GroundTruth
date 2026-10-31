import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), override: true });

const { initializeRuntime } = await import("./court/runtime.js");
const { CourtState } = await import("./court/state.js");
const { createServer } = await import("./http/server.js");
const { reportProviderFailure } = await import("./court/court.js");

// runLoop is fire-and-forget; a failed provider call must not kill the court. The per-phase
// watchdog in court.ts records a missed deadline instead of inventing a position.
process.on("unhandledRejection", (reason) => {
  console.error("[ground-truth] agent turn failed:", (reason as Error)?.message ?? reason);
  reportProviderFailure(reason);
});

initializeRuntime({ state: new CourtState() });
const port = Number(process.env.PORT) || 8787;
createServer().listen(port, () => {
  console.log(`[ground-truth] court in session on http://localhost:${port} (model: ${process.env.MOZAIK_MODEL || "claude-haiku-4-5"})`);
});
