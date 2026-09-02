/**
 * Presentation constants — timings and fallbacks the *picture* needs, which the
 * SDK does not send.
 *
 * This is what is left of the old `GAME_CONFIG` / `ROUND_TIMINGS` / `CURVE` /
 * `CRASH` block. Everything that was game truth in there — starting balance,
 * bet limits, phase durations, the growth curve, the crash distribution — is
 * the server's and now arrives as `useGameConfig()` or on the tick.
 *
 * Nothing here may be used to decide anything. It sizes a bar and times a CSS
 * flash; if a value below ever starts gating a bet or a phase, it is in the
 * wrong file.
 */

/**
 * Nominal phase lengths, for animation geometry only.
 *
 * TODO(sdk): the tick carries `remainingMs` but no phase total, so the
 * countdown bar has nothing to measure its fill against. Confirm with the
 * integration team whether `game-config` carries the betting-window length; if
 * it does, read it from `useGameConfig()` and delete `bettingMs` here.
 */
export const PHASE_DISPLAY = {
  /** Denominator for the countdown bar's fill. */
  bettingMs: 6000,
  /** How long the red crash flash is held over the canvas. */
  crashedMs: 3000,
} as const;

/** How long a win notice stays on screen before dismissing itself. */
export const WIN_NOTIFICATION_MS = 4000;

/**
 * Shown until `game-config` arrives. A label, never a calculation — no amount
 * is ever converted or compared against this.
 */
export const FALLBACK_CURRENCY = "USD";

/** Quick-stake chips under the amount stepper. Purely a UI affordance. */
export const QUICK_STAKES = [2, 4, 6] as const;

/** Highest stake the "Max" chip asks for. Server limits still apply. */
export const MAX_STAKE_SHORTCUT = 9999;
