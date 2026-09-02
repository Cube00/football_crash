import { useMemo } from "react";
import { placeholderClient } from "./client";
import type { KrashClient } from "./client";
import {
  BetButtonVariant,
  BetLayout,
  ConnectionState,
  GamePhase,
  LaunchStatus,
} from "./types";
import type {
  AutoPlayConfig,
  AutoPlayStopReason,
  BetSlot,
  FreeroundGrant,
  FreeroundHistoryEntry,
  FreeroundState,
  FreeroundSummaryPayload,
  GameConfig,
  GameHistoryItem,
  MyHistoryRound,
  PlaceBetOptions,
  SlotSnapshot,
} from "./types";

/**
 * Mirrors of the hooks `@krash/react` exports.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TEMPORARY — see `types.ts`. Every hook below returns an inert value because
 * there is no server in this build. When the SDK is installed, this whole file
 * collapses to:
 *
 *     export {
 *       useBalance, usePhase, useMultiplier, useCrashedAt, useGameConfig,
 *       useIsGameFrozen, useConnectionStatus, useWinDisplay, useBetting,
 *       useBettingSlot, useBetLayout, useAutoPlay, useFreerounds,
 *       useGameHistory, useMyBets, useKrashClient, useKrashState,
 *     } from "@krash/react";
 *
 * and every consumer keeps working untouched. That is the whole point of the
 * signatures being exact.
 *
 * Do not add logic here. A stub that starts computing is a second engine, and
 * a second engine is what we just spent this pass deleting.
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ── Provider ────────────────────────────────────────────────────────── */

export interface KrashStateSnapshot {
  launchStatus: LaunchStatus;
  launchError: string | null;
  /** Set once the session is exchanged. */
  sessionToken: string | null;
  username: string | null;
}

const KRASH_STATE: KrashStateSnapshot = Object.freeze({
  /**
   * `Ready`, not `Loading`, so the skin renders while the SDK is absent. Once
   * `KrashProvider` is mounted this becomes the real launch status and the
   * loader gate in `App` starts doing its job.
   */
  launchStatus: LaunchStatus.Ready,
  launchError: null,
  sessionToken: null,
  username: null,
});

export function useKrashClient(): KrashClient {
  return placeholderClient;
}

export function useKrashState(): KrashStateSnapshot {
  return KRASH_STATE;
}

/* ── Game state ──────────────────────────────────────────────────────── */

export function useBalance(): number {
  return 0;
}

export function usePhase(): GamePhase {
  return GamePhase.BettingOpen;
}

/** The live multiplier. Updates ~10×/sec in FLYING — read it only where shown. */
export function useMultiplier(): number {
  return 1;
}

export function useCrashedAt(): number | null {
  return null;
}

export function useGameConfig(): GameConfig | null {
  return null;
}

/** True when no tick has arrived for 2+ seconds. */
export function useIsGameFrozen(): boolean {
  return false;
}

export interface ConnectionStatus {
  state: ConnectionState;
  lagMs: number;
}

const CONNECTION_STATUS: ConnectionStatus = Object.freeze({
  state: ConnectionState.Connected,
  lagMs: 0,
});

export function useConnectionStatus(): ConnectionStatus {
  return CONNECTION_STATUS;
}

export interface WinDisplay {
  winAmount: number | null;
  winTimestamp: number | null;
  clearWin: () => void;
}

const noop = () => {};

const WIN_DISPLAY: WinDisplay = Object.freeze({
  winAmount: null,
  winTimestamp: null,
  clearWin: noop,
});

/** The player's most recent cashout, for the win notice. */
export function useWinDisplay(): WinDisplay {
  return WIN_DISPLAY;
}

/* ── Betting ─────────────────────────────────────────────────────────── */

const IDLE_SLOT: SlotSnapshot = Object.freeze({
  bet: null,
  betInputAmount: 0,
  hasPendingBet: false,
  betFailed: false,
  buttonVariant: BetButtonVariant.Bet,
  isButtonDisabled: true,
  isSending: false,
});

export interface BettingReturn {
  slotState: SlotSnapshot;
  placeBet: (amount: number, options?: PlaceBetOptions) => void;
  cashout: () => void;
  cancelBet: () => void;
  setBetAmount: (amount: number) => void;
}

export function useBetting(slot: BetSlot): BettingReturn {
  return useMemo(
    () => ({
      slotState: IDLE_SLOT,
      placeBet: noop,
      cashout: noop,
      cancelBet: noop,
      setBetAmount: noop,
    }),
    // `slot` is listed because the real hook is per-slot; the placeholder has
    // no slot-specific value to return yet, so the linter sees it as unused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot],
  );
}

export interface AutoCashoutControls {
  enabled: boolean;
  multiplier: number;
  onToggle: (enabled: boolean) => void;
  onMultiplierChange: (multiplier: number) => void;
  /** False while auto-play is running — the target is locked in. */
  canChangeMultiplier: boolean;
}

export interface BettingSlotReturn {
  slotState: SlotSnapshot;
  onBet: (amount: number) => void;
  onBetAmountChange: (amount: number) => void;
  cashout: () => void;
  cancelBet: () => void;
  autoCashout: AutoCashoutControls;
  isAutoPlayActive: boolean;
  autoPlayRemainingRounds: number;
  autoPlayConfig: AutoPlayConfig;
  onStartAutoPlay: () => void;
  onStopAutoPlay: () => void;
  updateAutoPlayConfig: (partial: Partial<AutoPlayConfig>) => void;
}

export const DEFAULT_AUTO_PLAY_CONFIG: AutoPlayConfig = Object.freeze({
  isEnabled: false,
  rounds: 20,
  autoCashOut: { enabled: false, multiplier: 2 },
  stopOnCashDecrease: { enabled: false, amount: 0 },
  stopOnCashIncrease: { enabled: false, amount: 0 },
  stopOnSingleWin: { enabled: false, amount: 0 },
});

/**
 * Betting + auto-play + auto-cashout for one slot.
 *
 * Preferred over `useBetting` wherever the panel also owns an auto-cashout
 * control: this is the hook that sends `autoCashoutAt` on placement and holds
 * the multiplier to a bound grant's `minCashout` floor.
 */
export function useBettingSlot(slot: BetSlot): BettingSlotReturn {
  return useMemo(
    () => ({
      slotState: IDLE_SLOT,
      onBet: noop,
      onBetAmountChange: noop,
      cashout: noop,
      cancelBet: noop,
      autoCashout: {
        enabled: false,
        multiplier: DEFAULT_AUTO_PLAY_CONFIG.autoCashOut.multiplier,
        onToggle: noop,
        onMultiplierChange: noop,
        canChangeMultiplier: true,
      },
      isAutoPlayActive: false,
      autoPlayRemainingRounds: 0,
      autoPlayConfig: DEFAULT_AUTO_PLAY_CONFIG,
      onStartAutoPlay: noop,
      onStopAutoPlay: noop,
      updateAutoPlayConfig: noop,
    }),
    // `slot` is listed because the real hook is per-slot; the placeholder has
    // no slot-specific value to return yet, so the linter sees it as unused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot],
  );
}

export interface BetLayoutReturn {
  layout: BetLayout;
  setLayout: (layout: BetLayout) => void;
}

const BET_LAYOUT: BetLayoutReturn = Object.freeze({
  layout: BetLayout.Double,
  setLayout: noop,
});

export function useBetLayout(): BetLayoutReturn {
  return BET_LAYOUT;
}

/* ── Auto-play ───────────────────────────────────────────────────────── */

export interface AutoPlayReturn {
  config: AutoPlayConfig;
  isActive: boolean;
  /** Rounds left; counts down. */
  currentRound: number;
  totalRounds: number;
  remainingRounds: number;
  /** Preset round counts offered in the UI. */
  roundOptions: readonly number[];
  start: (rounds: number) => void;
  stop: (reason?: AutoPlayStopReason) => void;
  updateConfig: (partial: Partial<AutoPlayConfig>) => void;
  /** Sets the round count without starting. */
  selectRounds: (rounds: number) => void;
  reset: () => void;
}

const ROUND_OPTIONS: readonly number[] = Object.freeze([20, 50, 100, 200]);

export function useAutoPlay(slot: BetSlot): AutoPlayReturn {
  return useMemo(
    () => ({
      config: DEFAULT_AUTO_PLAY_CONFIG,
      isActive: false,
      currentRound: 0,
      totalRounds: 0,
      remainingRounds: 0,
      roundOptions: ROUND_OPTIONS,
      start: noop,
      stop: noop,
      updateConfig: noop,
      selectRounds: noop,
      reset: noop,
    }),
    // `slot` is listed because the real hook is per-slot; the placeholder has
    // no slot-specific value to return yet, so the linter sees it as unused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot],
  );
}

/* ── Free rounds ─────────────────────────────────────────────────────── */

export interface FreeroundsReturn {
  /** The bound grant — the only place to read its kind, amounts and floor. */
  state: FreeroundState | null;
  isActive: boolean;
  /** AVAILABLE + IN_PROGRESS. */
  grants: readonly FreeroundGrant[];
  history: readonly FreeroundHistoryEntry[];
  /** Set from `freeround-summary` only — this is what opens the modal. */
  lastCompleted: FreeroundSummaryPayload | null;
  bind: (grantId: string) => void;
  unbind: () => void;
  refresh: () => void;
  loadHistory: (page?: number, pageSize?: number) => void;
  acknowledgeCompleted: () => void;
}

const NO_GRANTS: readonly FreeroundGrant[] = Object.freeze([]);
const NO_HISTORY: readonly FreeroundHistoryEntry[] = Object.freeze([]);

const FREEROUNDS: FreeroundsReturn = Object.freeze({
  state: null,
  isActive: false,
  grants: NO_GRANTS,
  history: NO_HISTORY,
  lastCompleted: null,
  bind: noop,
  unbind: noop,
  refresh: noop,
  loadHistory: noop,
  acknowledgeCompleted: noop,
});

export function useFreerounds(): FreeroundsReturn {
  return FREEROUNDS;
}

/* ── History ─────────────────────────────────────────────────────────── */

export interface GameHistoryReturn {
  items: readonly GameHistoryItem[];
  fetch: () => void;
}

const GAME_HISTORY: GameHistoryReturn = Object.freeze({
  items: Object.freeze([]) as readonly GameHistoryItem[],
  fetch: noop,
});

export function useGameHistory(): GameHistoryReturn {
  return GAME_HISTORY;
}

export interface MyBetsReturn {
  rounds: readonly MyHistoryRound[];
  total: number;
  fetch: () => void;
}

const MY_BETS: MyBetsReturn = Object.freeze({
  rounds: Object.freeze([]) as readonly MyHistoryRound[],
  total: 0,
  fetch: noop,
});

export function useMyBets(): MyBetsReturn {
  return MY_BETS;
}
