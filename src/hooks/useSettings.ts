import { useCallback, useSyncExternalStore } from "react";
import { settingsStore } from "@/game/settingsStore";
import type { Settings } from "@/game/persistence";

/** Selector hooks over the {@link settingsStore}, matching `useGame`'s shape. */
function useSelector<T>(selector: (settings: Settings) => T): T {
  const getSnapshot = useCallback(
    () => selector(settingsStore.getSnapshot()),
    [selector],
  );
  return useSyncExternalStore(settingsStore.subscribe, getSnapshot);
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
  );
}

/** Whether the animated canvas should run at all. */
export function useAnimationEnabled(): boolean {
  return useSelector((s) => s.animation);
}
