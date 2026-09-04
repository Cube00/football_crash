/**
 * Presentation constants — timings the *picture* needs, which the SDK does not
 * send and never will.
 *
 * This is what is left of the old `GAME_CONFIG` / `ROUND_TIMINGS` / `CURVE` /
 * `CRASH` block. Everything that was game truth in there — starting balance,
 * bet limits, phase durations, the growth curve, the crash distribution — is
 * the server's and arrives as `useGameConfig()` or on the tick.
 *
 * What else has left this file, and where it went:
 *
 *   - `FALLBACK_CURRENCY` → `useMoney()`, over `GameConfig.currencyCode` with
 *     the SDK's `CurrencyProvider` behind it.
 *   - `QUICK_STAKES` / `MAX_STAKE_SHORTCUT` → `clientConfig.speedButtons` and a
 *     Max computed from `minBet`/`maxBet`/balance. The operator sets those.
 *   - `PHASE_DISPLAY.bettingMs` → the first tick of each betting window. The
 *     server owns the phase length and sends what is left of it; a nominal six
 *     seconds here was a guess at a number we were already being told.
 *
 * Nothing here may be used to decide anything. It times a CSS flash and a
 * toast; if a value below ever starts gating a bet or a phase, it is in the
 * wrong file.
 */

/** How long the red crash flash is held over the canvas. */
export const CRASH_FLASH_MS = 3000;

/** How long a win notice stays on screen before dismissing itself. */
export const WIN_NOTIFICATION_MS = 4000;
