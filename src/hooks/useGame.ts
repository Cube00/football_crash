import { useCallback, useSyncExternalStore } from "react";
import { gameStore } from "@/game/store";
import type { GameSnapshot, SlotSnapshot } from "@/game/store";
import type { BetSlot } from "@/game/enums";
import type { GamePhase } from "@/game/enums";
import type { BetUpdatePayload, CrashHistoryItemPayload } from "@/game/events";

/**
 * Selector hooks over the reactive {@link gameStore}. Each subscribes via
 * `useSyncExternalStore` and returns a stable slice, so a component only
 * re-renders when the slice it reads actually changes.
 */
function useSelector<T>(selector: (snapshot: GameSnapshot) => T): T {
  const getSnapshot = useCallback(
    () => selector(gameStore.getSnapshot()),
    [selector],
  );
  return useSyncExternalStore(gameStore.subscribe, getSnapshot);
}

export function usePhase(): GamePhase {
  return useSelector((s) => s.phase);
}

export function useBalance(): number {
  return useSelector((s) => s.balance);
}

export function useCrashed(): boolean {
  return useSelector((s) => s.crashed);
}

export function useLastCrash(): number | null {
  return useSelector((s) => s.lastCrash);
}

export function useCrashHistory(): CrashHistoryItemPayload[] {
  return useSelector((s) => s.crashHistory);
}

/** The rolling bets feed — this round's bets first, earlier rounds below. */
export function useBets(): BetUpdatePayload[] {
  return useSelector((s) => s.bets);
}

const slotSelectors: ReadonlyArray<(s: GameSnapshot) => SlotSnapshot> = [
  (s) => s.slots[0],
  (s) => s.slots[1],
];

export function useSlot(slot: BetSlot): SlotSnapshot {
  return useSelector(slotSelectors[slot]);
}
