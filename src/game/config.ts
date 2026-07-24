/**
 * Dummy game configuration — the local stand-in for what a real backend would
 * send as a `GameConfig` payload. Tune these to change the feel of the game.
 */
export const GAME_CONFIG = {
  currency: "USD",
  startingBalance: 1000,
  minBet: 0.1,
  maxBet: 1000,
  /** Default stake a fresh bet slot starts with. */
  defaultBet: 1,
  /** Quick-select stake chips shown under the amount stepper. */
  quickAmounts: [2, 4, 6] as const,
} as const;

/** Phase durations, in milliseconds. */
export const ROUND_TIMINGS = {
  /** Betting window where stakes can be placed. */
  bettingMs: 6000,
  /** Brief lock-in before the round flies. */
  closingMs: 800,
  /** Pause on the crash screen before the next betting window. */
  crashedMs: 3000,
} as const;

/** Multiplier growth curve during the FLYING phase. */
export const CURVE = {
  /**
   * Exponential growth rate `k` in `multiplier = e^(k * elapsedSeconds)`.
   * Higher = faster acceleration. `k = 0.15` reaches ~2× at 4.6s, ~10× at 15s.
   */
  growthRate: 0.15,
  /** Tick cadence in ms (~30 fps). */
  tickMs: 33,
} as const;

/** Crash-point distribution parameters. */
export const CRASH = {
  /** Chance a round instantly busts at 1.00×. */
  instantChance: 0.02,
  /**
   * House edge factor in `crash = houseEdge / (1 - random)`. Lower = harsher.
   * 0.97 ≈ a 97% RTP-shaped curve with a median crash around ~1.9×.
   */
  houseEdge: 0.97,
  /** Upper bound so a lucky round can't run away to absurd values. */
  maxCrash: 1000,
} as const;

/** Number of fake bot players generated per round for the live bets list. */
export const FAKE_BETS = {
  minPlayers: 6,
  maxPlayers: 14,
} as const;
