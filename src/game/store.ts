import { EventBus } from "./EventBus";
import { GameEvent } from "./events";
import type {
  BalancePayload,
  BetUpdatePayload,
  CrashHistoryItemPayload,
  CrashStatePayload,
} from "./events";
import { BetSlot, BetState, GamePhase } from "./enums";
import { GAME_CONFIG } from "./config";
import { generateSeedHistory } from "./engine/crashHistory";

/**
 * Reactive game store — the single source of truth React reads from.
 *
 * It subscribes to the engine's {@link GameEvent} stream and folds it into an
 * immutable snapshot exposed through `useSyncExternalStore`. Sub-objects
 * (`slots[i]`, `roundBets`, `crashHistory`) keep their reference when they
 * haven't changed, so selector hooks re-render only their own consumers.
 *
 * The live per-tick multiplier is deliberately NOT stored here — it changes
 * ~30×/sec and would thrash every subscriber. Read it via `useTick` instead.
 */

export interface SlotSnapshot {
  state: BetState;
  /** Stake of the placed bet (0 when idle). */
  amount: number;
  winMultiplier?: number;
  winAmount?: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  balance: number;
  crashed: boolean;
  lastCrash: number | null;
  crashHistory: CrashHistoryItemPayload[];
  roundBets: BetUpdatePayload[];
  slots: readonly [SlotSnapshot, SlotSnapshot];
}

const IDLE_SLOT: SlotSnapshot = { state: BetState.Idle, amount: 0 };
const MAX_HISTORY = 30;
const MAX_ROUND_BETS = 60;

let snapshot: GameSnapshot = {
  phase: GamePhase.BettingOpen,
  balance: GAME_CONFIG.startingBalance,
  crashed: false,
  lastCrash: null,
  crashHistory: generateSeedHistory(),
  roundBets: [],
  slots: [IDLE_SLOT, IDLE_SLOT],
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function patchSlot(slot: BetSlot, patch: Partial<SlotSnapshot>) {
  const slots: [SlotSnapshot, SlotSnapshot] = [
    snapshot.slots[0],
    snapshot.slots[1],
  ];
  slots[slot] = { ...slots[slot], ...patch };
  snapshot = { ...snapshot, slots };
}

function upsertRoundBet(update: BetUpdatePayload) {
  const rows = snapshot.roundBets.filter((r) => r.betId !== update.betId);
  if (update.status !== BetState.Idle) {
    rows.unshift(update);
  }
  snapshot = { ...snapshot, roundBets: rows.slice(0, MAX_ROUND_BETS) };
}

// ─── Event handlers ────────────────────────────────────────────

function onBalance({ balance }: BalancePayload) {
  if (snapshot.balance === balance) return;
  snapshot = { ...snapshot, balance };
  notify();
}

/**
 * Clears both slots for a fresh round. Driven by the engine's `PhaseReset`,
 * which is emitted *before* `GamePhaseChange(BettingOpen)` — so an auto-play bet
 * placed during that phase-change dispatch survives instead of being reset by a
 * later-running listener.
 */
function onPhaseReset() {
  snapshot = { ...snapshot, crashed: false, slots: [IDLE_SLOT, IDLE_SLOT] };
  notify();
}

function onPhaseChange(phase: GamePhase) {
  if (phase === GamePhase.BettingOpen) {
    snapshot = { ...snapshot, phase };
  } else if (phase === GamePhase.Flying) {
    // Promote each accepted bet to active so the button flips to Cashout.
    const slots: [SlotSnapshot, SlotSnapshot] = [
      snapshot.slots[0].state === BetState.Placed
        ? { ...snapshot.slots[0], state: BetState.Active }
        : snapshot.slots[0],
      snapshot.slots[1].state === BetState.Placed
        ? { ...snapshot.slots[1], state: BetState.Active }
        : snapshot.slots[1],
    ];
    snapshot = { ...snapshot, phase, slots };
  } else {
    snapshot = { ...snapshot, phase };
  }
  notify();
}

function onCrashState({ crashed, multiplier }: CrashStatePayload) {
  snapshot = {
    ...snapshot,
    crashed,
    lastCrash: crashed && multiplier != null ? multiplier : snapshot.lastCrash,
  };
  notify();
}

function onCrashHistoryItem(item: CrashHistoryItemPayload) {
  const crashHistory = [item, ...snapshot.crashHistory].slice(0, MAX_HISTORY);
  snapshot = { ...snapshot, crashHistory };
  notify();
}

function onBettingHistoryClear() {
  if (snapshot.roundBets.length === 0) return;
  snapshot = { ...snapshot, roundBets: [] };
  notify();
}

function onBetUpdate(update: BetUpdatePayload) {
  upsertRoundBet(update);

  if (update.own && update.slot != null) {
    switch (update.status) {
      case BetState.Queued:
        patchSlot(update.slot, {
          state: BetState.Queued,
          amount: update.amount,
          winMultiplier: undefined,
          winAmount: undefined,
        });
        break;
      case BetState.Placed:
        patchSlot(update.slot, {
          state: BetState.Placed,
          amount: update.amount,
          winMultiplier: undefined,
          winAmount: undefined,
        });
        break;
      case BetState.Won:
        patchSlot(update.slot, {
          state: BetState.Won,
          winMultiplier: update.cashedOutAt,
          winAmount: update.payout,
        });
        break;
      case BetState.Lost:
        patchSlot(update.slot, { state: BetState.Lost });
        break;
      case BetState.Idle:
        patchSlot(update.slot, {
          state: BetState.Idle,
          amount: 0,
          winMultiplier: undefined,
          winAmount: undefined,
        });
        break;
      default:
        break;
    }
  }
  notify();
}

// ─── Public API ────────────────────────────────────────────────

let connected = false;

export const gameStore = {
  /** Attach engine listeners. Idempotent; returns a disconnect function. */
  connect(): () => void {
    if (connected) return () => gameStore.disconnect();
    connected = true;
    EventBus.on(GameEvent.Balance, onBalance);
    EventBus.on(GameEvent.PhaseReset, onPhaseReset);
    EventBus.on(GameEvent.GamePhaseChange, onPhaseChange);
    EventBus.on(GameEvent.CrashState, onCrashState);
    EventBus.on(GameEvent.CrashHistoryItem, onCrashHistoryItem);
    EventBus.on(GameEvent.BettingHistoryClear, onBettingHistoryClear);
    EventBus.on(GameEvent.BetUpdate, onBetUpdate);
    return () => gameStore.disconnect();
  },

  disconnect() {
    connected = false;
    EventBus.off(GameEvent.Balance, onBalance);
    EventBus.off(GameEvent.PhaseReset, onPhaseReset);
    EventBus.off(GameEvent.GamePhaseChange, onPhaseChange);
    EventBus.off(GameEvent.CrashState, onCrashState);
    EventBus.off(GameEvent.CrashHistoryItem, onCrashHistoryItem);
    EventBus.off(GameEvent.BettingHistoryClear, onBettingHistoryClear);
    EventBus.off(GameEvent.BetUpdate, onBetUpdate);
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot: (): GameSnapshot => snapshot,
};
