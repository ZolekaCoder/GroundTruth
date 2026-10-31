/** No-LLM check of the evidence pipeline: real search, real retrieval, and quote verification. */
import { CourtState } from "../court/state.js";
import { initializeRuntime } from "../court/runtime.js";
import { excerpt, fetchSource, quoteIsGrounded, searchWikipedia } from "../court/sources.js";
import type { Case } from "../court/types.js";

initializeRuntime({ state: new CourtState() });
const c = { id: "check", sources: [] } as unknown as Case;
const results = await searchWikipedia("Great Wall of China visible from space");
console.log("search:", results.slice(0, 3).map((r: any) => r.title));
const s = await fetchSource(c, results[0].url, "investigator");
console.log(`read ${s.id}: ${s.title} — ${s.text.length} chars, updated ${s.published}`);
const passage = excerpt(s, "visible from space naked eye astronaut", 800);
const real = passage.split(/(?<=\.)\s/)[0];
console.log("real quote grounded:", quoteIsGrounded(s, real), "→", real.slice(0, 100));
console.log("fabricated quote grounded:", quoteIsGrounded(s, "The Great Wall is clearly visible from the Moon according to NASA."));
