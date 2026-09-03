/**
 * Fallback quick-stake chips.
 *
 * The real ones are the operator's: `clientConfig.speedButtons`, three of them,
 * each with its own label and value, delivered with `game-config`. These are
 * used only until that arrives — or for an operator who has configured none.
 *
 * The `Max` chip is not in this list and never was a number: it is
 * `min(maxBet, balance)` floored at `minBet`, all three of which the SDK
 * supplies. A constant there could only ever be wrong.
 */
export const FALLBACK_QUICK_STAKES = [2, 4, 6] as const;

/**
 * `clientConfig.multiplyButton` — the operator's ×N stake button — is read by
 * nothing on purpose: this panel does not have that control, and adding one is
 * a design decision rather than an integration one. The field is in
 * `GameConfig` when it is wanted.
 */

/** Step for the amount stepper when `clientConfig.betStep` is absent. */
export const DEFAULT_BET_STEP = 1;
