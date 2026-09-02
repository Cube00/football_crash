/**
 * The menu's three switches: sound, music, animation.
 *
 * These are device preferences about the skin — whether to make noise, and
 * whether to run the Phaser canvas at all — not account state, so they are kept
 * here rather than taken from the SDK. Two things need them from outside React:
 * `playSound` is a module function called from leaf components, and the canvas
 * decision is read before any provider mounts.
 *
 * TODO(sdk): `@krash/react` ships an optional `SettingsProvider` / `useSettings()`.
 * Its shape is not documented and it almost certainly has no `animation` flag,
 * which is a canvas concern the SDK cannot know about. Ask the integration team
 * whether these three should live there — if so, this file goes and `playSound`
 * reads a value pushed in from `useSettings()`.
 */

export type Settings = {
  sound: boolean;
  music: boolean;
  /** The animated canvas is the default; the menu can switch it off. */
  animation: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  animation: true,
};

const STORAGE_KEY = "footballcrash.settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable — the switches just won't survive a reload.
  }
}

let snapshot: Settings = load();

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
    save(snapshot);
    for (const listener of listeners) listener();
  },
};
