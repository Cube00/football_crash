import { BetSlot } from "./enums";
import { GAME_CONFIG } from "./config";
import { DEFAULT_AUTO_PLAY_CONFIG } from "./autoplay";
import type { AutoPlayConfig } from "./autoplay";

/**
 * Lightweight localStorage persistence for per-slot bet amounts and auto-play
 * config, so a page reload keeps the player's setup. Runtime state (active
 * bets, whether auto-play is currently running) is never persisted.
 */

const STORAGE_KEY = "footballcrash.game_state";

/**
 * The menu's switches. Nothing consumes these yet — see `saveSettings`.
 *
 * A type rather than an interface so it satisfies the menu's
 * `Record<string, boolean>`; interfaces get no implicit index signature.
 */
export type Settings = {
  sound: boolean;
  music: boolean;
  animation: boolean;
};

export interface PersistedState {
  betAmounts: Record<BetSlot, number>;
  autoPlayConfig: Record<BetSlot, AutoPlayConfig>;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  /** The animated canvas is the default experience; the menu can switch it off. */
  animation: true,
};

const DEFAULTS: PersistedState = {
  betAmounts: {
    [BetSlot.Slot1]: GAME_CONFIG.defaultBet,
    [BetSlot.Slot2]: GAME_CONFIG.defaultBet,
  },
  autoPlayConfig: {
    [BetSlot.Slot1]: DEFAULT_AUTO_PLAY_CONFIG,
    [BetSlot.Slot2]: DEFAULT_AUTO_PLAY_CONFIG,
  },
  settings: DEFAULT_SETTINGS,
};

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      betAmounts: {
        [BetSlot.Slot1]:
          num(parsed.betAmounts?.[BetSlot.Slot1]) ??
          DEFAULTS.betAmounts[BetSlot.Slot1],
        [BetSlot.Slot2]:
          num(parsed.betAmounts?.[BetSlot.Slot2]) ??
          DEFAULTS.betAmounts[BetSlot.Slot2],
      },
      autoPlayConfig: {
        [BetSlot.Slot1]: mergeConfig(parsed.autoPlayConfig?.[BetSlot.Slot1]),
        [BetSlot.Slot2]: mergeConfig(parsed.autoPlayConfig?.[BetSlot.Slot2]),
      },
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return DEFAULTS;
  }
}

function save(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — ignore.
  }
}

export function saveBetAmount(slot: BetSlot, amount: number) {
  const state = loadState();
  state.betAmounts[slot] = amount;
  save(state);
}

/**
 * Stores the menu's switches. They are remembered but not yet wired to
 * anything: the game has no audio, and "animation" has no consumer.
 */
export function saveSettings(settings: Settings) {
  const state = loadState();
  state.settings = settings;
  save(state);
}

export function saveAutoPlayConfig(slot: BetSlot, config: AutoPlayConfig) {
  const state = loadState();
  // Never persist the "currently running" flag.
  state.autoPlayConfig[slot] = { ...config, autoBet: false };
  save(state);
}

function num(value: unknown): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function mergeConfig(value: Partial<AutoPlayConfig> | undefined): AutoPlayConfig {
  if (!value || typeof value !== "object") return DEFAULT_AUTO_PLAY_CONFIG;
  return {
    ...DEFAULT_AUTO_PLAY_CONFIG,
    ...value,
    autoBet: false,
    autoCashOut: {
      ...DEFAULT_AUTO_PLAY_CONFIG.autoCashOut,
      ...value.autoCashOut,
    },
    stopOnCashDecrease: {
      ...DEFAULT_AUTO_PLAY_CONFIG.stopOnCashDecrease,
      ...value.stopOnCashDecrease,
    },
    stopOnCashIncrease: {
      ...DEFAULT_AUTO_PLAY_CONFIG.stopOnCashIncrease,
      ...value.stopOnCashIncrease,
    },
    stopOnSingleWin: {
      ...DEFAULT_AUTO_PLAY_CONFIG.stopOnSingleWin,
      ...value.stopOnSingleWin,
    },
  };
}
