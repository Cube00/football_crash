import { useCallback, useSyncExternalStore } from "react";
import { freeBetStore } from "@/game/freeBetStore";
import type { FreeBetSnapshot } from "@/game/freeBetStore";
import { remainingOf } from "@/game/freeBets";
import type { FreeBetGrant } from "@/game/freeBets";

/** Selector hooks over the {@link freeBetStore}, matching `useGame`'s shape. */
function useSelector<T>(selector: (snapshot: FreeBetSnapshot) => T): T {
  const getSnapshot = useCallback(
    () => selector(freeBetStore.getSnapshot()),
    [selector],
  );
  return useSyncExternalStore(freeBetStore.subscribe, getSnapshot);
}

export function useFreeBets(): FreeBetSnapshot {
  return useSyncExternalStore(
    freeBetStore.subscribe,
    freeBetStore.getSnapshot,
  );
}

/** The staked grant, or null when the player is betting real money. */
export function useActiveFreeBet(): FreeBetGrant | null {
  return useSelector(
    (s) => s.grants.find((grant) => grant.id === s.activeId) ?? null,
  );
}

/** Bets left across every stakeable grant — what the stage button counts. */
export function useFreeBetsRemaining(): number {
  return useSelector((s) => s.totalRemaining);
}

export { remainingOf };
