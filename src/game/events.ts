import type { BetSlot, BetState, GamePhase } from "./enums";

/**
 * Every event name that flows across the {@link EventBus}. Names are grouped
 * by origin:
 *
 * - `engine:*` — pushed by the local fake crash engine (stands in for what a
 *   real server would broadcast). Consumed by React hooks and the Phaser scene.
 * - `cmd:*` — commands sent by the UI to the engine (place/cashout/cancel).
 * - the rest — internal React ↔ Phaser bridge signals.
 *
 * The engine layer is deliberately the only place these are produced, so
 * swapping in a real backend later means re-emitting the same names from a
 * socket handler and nothing downstream changes.
 */
export const GameEvent = {
  // ── engine → app ──────────────────────────────────────────────
  /** Per-frame round update: multiplier, phase, round id, remaining ms. */
  Tick: "engine:tick",
  /** Crash flag flipped (true at crash, false when a new round opens). */
  CrashState: "engine:crash-state",
  /** Multiplier display should reset to 1.00 for a fresh round. */
  PhaseReset: "engine:phase-reset",
  /** A new betting round opened — the point new bets start arriving from. */
  NewBettingRound: "engine:new-betting-round",
  /** A finished round's crash multiplier, prepended to the history pills. */
  CrashHistoryItem: "engine:crash-history-item",
  /** The current (live) round id changed, or null between rounds. */
  CurrentRound: "engine:current-round",
  /** Account balance update. */
  Balance: "engine:balance",
  /** Acknowledgement that a placed bet was accepted. */
  BetPlaced: "engine:bet-placed",
  /** Acknowledgement that a cashout succeeded with payout details. */
  CashoutDone: "engine:cashout-done",
  /** Acknowledgement that a pending bet was cancelled and refunded. */
  CancelBetOk: "engine:cancel-bet-ok",
  /** A bet (own or another player's) changed state — feeds the bets list. */
  BetUpdate: "engine:bet-update",

  // ── app → engine (commands) ───────────────────────────────────
  /** UI asks the engine to place a bet. */
  CmdPlaceBet: "cmd:place-bet",
  /** UI asks the engine to cash out an active bet. */
  CmdCashout: "cmd:cashout",
  /** UI asks the engine to cancel a pending bet. */
  CmdCancelBet: "cmd:cancel-bet",

  // ── React ↔ Phaser bridge ─────────────────────────────────────
  /** Phaser scene finished creating and can receive sync events. */
  SceneReady: "scene-ready",
  /** Game phase changed; the Phaser scene should react. */
  GamePhaseChange: "game-phase-change",
  /** React asks the engine to re-broadcast the current phase. */
  RequestPhaseSync: "request-phase-sync",
  /** React tells Phaser whether the layout is mobile. */
  SetMobile: "set-mobile",
  /** Phaser canvas should recompute its dimensions after a layout change. */
  GameResize: "game-resize",
} as const;

export type GameEvent = (typeof GameEvent)[keyof typeof GameEvent];

// ─── Payload shapes ────────────────────────────────────────────

export interface TickPayload {
  multiplier: number;
  phase: GamePhase;
  roundId: string;
  remainingMs: number;
}

export interface CrashStatePayload {
  crashed: boolean;
  /** Present on the crashing tick — the final multiplier. */
  multiplier?: number;
}

export interface CrashHistoryItemPayload {
  id: string;
  roundId: string;
  multiplier: number;
}

export interface CurrentRoundPayload {
  roundId: string;
}

export interface BalancePayload {
  balance: number;
}

// ── Commands: UI → engine ──

export interface CmdPlaceBetPayload {
  slot: BetSlot;
  amount: number;
  currency: string;
  /** When set, the engine auto-cashes the bet once the tick reaches it. */
  autoCashoutAt?: number;
}

export interface CmdCashoutPayload {
  slot: BetSlot;
}

export interface CmdCancelBetPayload {
  slot: BetSlot;
}

// ── Acks: engine → UI ──

export interface BetPlacedPayload {
  slot: BetSlot;
  amount: number;
  currency: string;
  betId: string;
  balance: number;
}

export interface CashoutDonePayload {
  slot: BetSlot;
  multiplier: number;
  payout: number;
  betAmount: number;
  balance: number;
  /** True when triggered by an auto-cashout target rather than a manual tap. */
  auto: boolean;
}

export interface CancelBetOkPayload {
  slot: BetSlot;
  betId: string;
  balance: number;
}

/**
 * A single row in the live per-round bets list. Emitted both for the player's
 * own bets and for fake bot players, so the list is populated the same way a
 * real broadcast would populate it.
 */
export interface BetUpdatePayload {
  betId: string;
  /** Masked display name, e.g. `G****t`. */
  username: string;
  amount: number;
  currency: string;
  status: BetState;
  /** Multiplier the bet cashed out at, when it has been cashed out. */
  cashedOutAt?: number;
  /** Payout credited on cashout. */
  payout?: number;
  slot?: BetSlot;
  /** True for the current player's own bets. */
  own?: boolean;
}
