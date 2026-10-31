import { defineRuntime } from "@mozaik-ai/core";
import type { CourtState } from "./state.js";

export const { initializeRuntime, resolveRuntime, join, leave, sendEvent, runLoop } = defineRuntime<CourtState>();

export const MODEL = process.env.MOZAIK_MODEL?.trim() || "claude-haiku-4-5";

export function getCase(id: string) {
  return resolveRuntime().state.cases.get(id);
}
