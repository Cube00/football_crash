import { loadState, saveSettings } from "./persistence";
import type { Settings } from "./persistence";

/**
 * Reactive store for the menu's switches, in the same shape as {@link gameStore}
 * so React reads it through `useSyncExternalStore`.
 *
 * It lives outside React because two distant parts of the tree need it: the menu
 * writes it, and the game area reads it to decide whether to run the animated
 * canvas at all. Every change is written straight through to localStorage.
 */

let snapshot: Settings = loadState().settings;

const listeners = new Set<() => void>();

export const settingsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): Settings {
    return snapshot;
  },

  set(key: keyof Settings, value: boolean) {
    if (snapshot[key] === value) return;
    snapshot = { ...snapshot, [key]: value };
    saveSettings(snapshot);
    for (const listener of listeners) listener();
  },
};
