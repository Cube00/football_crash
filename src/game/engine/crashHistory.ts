import type { CrashHistoryItemPayload } from "../events";
import { CRASH } from "../config";

/**
 * Seed values for the crash-multiplier history pills so the strip isn't empty
 * on first load. Uses the same distribution the live engine draws from.
 */
function drawCrash(): number {
  if (Math.random() < CRASH.instantChance) return 1.0;
  const r = Math.random();
  const raw = CRASH.houseEdge / (1 - r);
  const capped = Math.min(raw, CRASH.maxCrash);
  return Math.max(1.01, Math.floor(capped * 100) / 100);
}

export function generateSeedHistory(count = 15): CrashHistoryItemPayload[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `seed-${i}`;
    return { id, roundId: id, multiplier: drawCrash() };
  });
}
