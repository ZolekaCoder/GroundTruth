import { RuntimeState } from "@mozaik-ai/core";
import type { Case } from "./types.js";

/** Shared Mozaik runtime state: every open case lives here, keyed by id. */
export class CourtState extends RuntimeState {
  cases = new Map<string, Case>();
}
