/**
 * Core game enums, expressed as `as const` objects rather than TypeScript
 * `enum`s — the project's tsconfig sets `erasableSyntaxOnly`, which forbids
 * runtime `enum` syntax. Each export pairs a value object with a matching
 * union type of the same name.
 */

/** Lifecycle phases of a single crash round. */
export const GamePhase = {
  /** Bets can be placed; multiplier is parked at 1.00×. */
  BettingOpen: "BETTING_OPEN",
  /** Short lock-in transition right before the round flies. */
  BettingClosing: "BETTING_CLOSING",
  /** Multiplier is rising until the round crashes. */
  Flying: "FLYING",
  /** Round ended at the crash multiplier. */
  Crashed: "CRASHED",
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

/** State of a single player's bet within a round. */
export const BetState = {
  /** No bet in this slot. */
  Idle: "idle",
  /** Pre-bet queued during a live/crashed round; auto-places next round. */
  Queued: "queued",
  /** Bet accepted, waiting for the round to start flying. */
  Placed: "placed",
  /** Round is flying and the bet is live (can be cashed out). */
  Active: "active",
  /** Cashed out before the crash. */
  Won: "won",
  /** Round crashed while the bet was still active. */
  Lost: "lost",
} as const;

export type BetState = (typeof BetState)[keyof typeof BetState];

/** The two independent bet slots shown side by side. */
export const BetSlot = {
  Slot1: 0,
  Slot2: 1,
} as const;

export type BetSlot = (typeof BetSlot)[keyof typeof BetSlot];
