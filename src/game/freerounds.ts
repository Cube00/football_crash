import type { FreeroundGrant, FreeroundState, SlotSnapshot } from "@/sdk";

/**
 * The display formulas the SDK's guide hands to the UI for free bets.
 *
 * These derive from the SDK's `freeround` slice; they never hold state of their
 * own. The old ticket ledger (`total`/`used`, spend on placement, give back on
 * cancel) is gone — the server owns that accounting and publishes it as a
 * balance, so a count is now something we *render*, not something we keep.
 */

/**
 * Floats divide badly: `0.7 / 0.1` is `6.999…`, and a badge that reads 6 when
 * seven bets are left is a support ticket. The docs' own formula carries this
 * nudge for the same reason.
 */
const EPSILON = 1e-9;

/**
 * Bets still on the grant.
 *
 * A grant is a wallet, not a book of tickets, so the count is a division. Works
 * unchanged through cancel, cashout, crash and reconnect, which is exactly why
 * the docs insist on it over any tally the UI keeps itself.
 */
export const remainingBets = (state: FreeroundState | FreeroundGrant): number =>
  state.betAmount > 0
    ? Math.floor(state.balanceRemaining / state.betAmount + EPSILON)
    : 0;

/**
 * Bets the grant started with.
 *
 * From `balanceInitial`, not from what is left plus rounds played: a cancelled
 * bet gives the stake back and decrements `roundsPlayed`, and on a range grant
 * the rounds played need not have cost one bet each. The server publishes the
 * opening balance for exactly this, so the pair below always divides the same
 * number two ways.
 */
export const totalBets = (state: FreeroundState | FreeroundGrant): number =>
  state.betAmount > 0
    ? Math.floor(state.balanceInitial / state.betAmount + EPSILON)
    : 0;

/**
 * Whether this slot should be locked out of starting another free bet.
 *
 * The server only decrements the grant when it answers a placement, so a bet
 * that is queued or still in flight has not been counted yet. Without
 * subtracting those, two empty slots both look affordable when only one bet is
 * left and the player can spend it twice.
 *
 * A confirmed bet is *not* subtracted: its `BetPlaced` already arrived, so the
 * balance behind {@link remainingBets} reflects it.
 */
export function isSlotFreebetLocked(
  state: FreeroundState | null,
  ownSlot: SlotSnapshot,
  slots: readonly SlotSnapshot[],
): boolean {
  if (!state?.isActive) return false;
  // Only an empty slot can be locked — one already holding a bet is past this.
  if (ownSlot.bet || ownSlot.hasPendingBet || ownSlot.isSending) return false;

  const reserved = slots.reduce(
    (sum, slot) => sum + (slot.hasPendingBet || slot.isSending ? 1 : 0),
    0,
  );
  return remainingBets(state) - reserved < 1;
}

/**
 * The stake a free bet is placed at.
 *
 * Fixed grants ignore the player's input entirely — the SDK sends `betAmount`
 * whatever the field says — so showing anything else would be a lie about what
 * the next bet costs.
 *
 * Range grants are the opposite: the SDK sends the input **unchanged**, with no
 * clamp of any kind, so the bounds have to be applied here or the server
 * rejects the bet. The ceiling is the grant's own balance as well as its
 * `betMax` — a grant with less left than `betMax` can only stake what it has.
 */
export function freebetStake(
  state: FreeroundState,
  inputAmount: number,
): number {
  if (state.kind !== "range") return state.betAmount;

  const ceiling = Math.min(state.betMax, state.balanceRemaining);
  return Math.min(Math.max(inputAmount, state.betMin), ceiling);
}

export interface ExpiryParts {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
}

/** Splits an ISO expiry into whole units, floored at zero. */
export function expiryParts(expiresAt: string): ExpiryParts {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  return {
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    minutes: totalMinutes % 60,
    expired: ms <= 0,
  };
}
