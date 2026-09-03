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
  LaunchSession,
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
 * signatures being exact — they are transcribed from
 * `.claude/sdk-docs/06-hooks-reference.md`.
 *
 * Do not add logic here. A stub that starts computing is a second engine, and
 * a second engine is what we spent two passes deleting. Browser-only utilities
 * are the exception and live in `dom.ts` / `contexts.tsx`, which say why.
 *
 * Hooks the SDK ships and the skin does not use yet — `useKrashGame`,
 * `useCurrencyMode`, `useIsMultiCurrency`, `useHasActiveBets` — are left out on
 * purpose. Mirror one when a call site appears.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Whether the real packages are behind this barrel.
 *
 * The one place the skin is allowed to ask. It exists because a gate that waits
 * for server state — `LaunchGate` waiting for `GameConfig` — would wait forever
 * against a placeholder that has no server to answer it. Flip it to `true` (or
 * delete it together with the branch it guards) as part of the install.
 */
export const SDK_INSTALLED = false;

/* ── Provider ────────────────────────────────────────────────────────── */

/**
 * What `useKrashState()` returns.
 *
 * `launchStatus` reaching `Ready` means the REST launch finished and the socket
 * connect *started* — not that the game is playable. The loader gate also needs
 * a connected socket and a `GameConfig` (`01-getting-started.md`).
 */
export interface KrashProviderState {
  client: KrashClient;
  launchStatus: LaunchStatus;
  session: LaunchSession | null;
  launchError: string | null;
  /** `session.mode === 'demo'`; before the session, read from the URL. */
  isDemo: boolean;
  /** From the launch URL, read once on mount. */
  lobbyUrl: string | null;
  exitUrl: string | null;
  /**
   * New demo session + relaunch. Never call it in a real-money session — it
   * swaps the player into demo; use `location.reload()` there.
   */
  relaunchDemo: () => Promise<void>;
}

const noop = () => {};

const KRASH_STATE: KrashProviderState = Object.freeze({
  client: placeholderClient,
  /**
   * `Ready`, not `Loading`, so the skin renders while the SDK is absent. Once
   * `KrashProvider` is mounted this becomes the real launch status and the
   * loader gate in `LaunchGate` starts doing its job.
   */
  launchStatus: LaunchStatus.Ready,
  session: null,
  launchError: null,
  isDemo: false,
  lobbyUrl: null,
  exitUrl: null,
  relaunchDemo: () => Promise.resolve(),
});

export function useKrashClient(): KrashClient {
  return placeholderClient;
}

export function useKrashState(): KrashProviderState {
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

/** `null` until the `game-config` response arrives. */
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
  /** `Date.now()` at the cashout; `0` when there is no win. */
  winTimestamp: number;
  clearWin: () => void;
}

const WIN_DISPLAY: WinDisplay = Object.freeze({
  winAmount: null,
  winTimestamp: 0,
  clearWin: noop,
});

/**
 * The player's most recent cashout. One value shared by both slots — on a
 * simultaneous double cashout only the last payout lands here.
 */
export function useWinDisplay(): WinDisplay {
  return WIN_DISPLAY;
}

/* ── Betting ─────────────────────────────────────────────────────────── */

/** The SDK's own starting input amount (`BettingEngine.ts:30`). */
const DEFAULT_BET_INPUT_AMOUNT = 5;

const IDLE_SLOT: SlotSnapshot = Object.freeze({
  bet: null,
  betInputAmount: DEFAULT_BET_INPUT_AMOUNT,
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

/** The engine's own defaults (`AutoPlayEngine.ts:15-22`). */
export const DEFAULT_AUTO_PLAY_CONFIG: AutoPlayConfig = Object.freeze({
  isEnabled: false,
  rounds: 0,
  autoCashOut: { enabled: false, multiplier: 2 },
  stopOnCashDecrease: { enabled: false, amount: 0 },
  stopOnCashIncrease: { enabled: false, amount: 0 },
  stopOnSingleWin: { enabled: false, amount: 0 },
});

/**
 * Betting + auto-play + auto-cashout for one slot.
 *
 * Preferred over `useBetting` wherever the panel also owns an auto-cashout
 * control: this is the hook that sends `autoCashoutAt` on placement. It does
 * **not** know about a grant's `minCashout` — holding the target above that
 * floor is the skin's job.
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
  /** Rounds left; counts down. The engine's own counter counts up. */
  currentRound: number;
  totalRounds: number;
  remainingRounds: number;
  /** Preset round counts offered in the UI. */
  roundOptions: readonly number[];
  /** Also syncs the button variant; in BETTING_OPEN it bets within 20 ms. */
  start: (rounds: number) => void;
  stop: (reason?: AutoPlayStopReason) => void;
  /** Shallow merge — always spread the nested objects. */
  updateConfig: (partial: Partial<AutoPlayConfig>) => void;
  /** Sets the round count without starting. */
  selectRounds: (rounds: number) => void;
  /** Everything to default except `autoCashOut`; emits no stop event. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot],
  );
}

/* ── Free rounds ─────────────────────────────────────────────────────── */

export interface FreeroundsReturn {
  /** The bound grant — the only place to read its kind, amounts and floor. */
  state: FreeroundState | null;
  isActive: boolean;
  /** The server returns AVAILABLE only; the SDK mirrors the active one in. */
  grants: readonly FreeroundGrant[];
  history: readonly FreeroundHistoryEntry[];
  /** Set from `freeround-summary` only — this is what opens the modal. */
  lastCompleted: FreeroundSummaryPayload | null;
  bind: (grantId: string) => void;
  unbind: () => void;
  /** Heavy — call it when the picker opens, not on a timer. */
  refresh: () => void;
  loadHistory: (page?: number, pageSize?: number) => void;
  /** Mandatory on close, or the next summary for this grant is deduped away. */
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
  /** `GetHistory { limit }`; the response replaces the whole list. */
  fetch: (limit?: number) => void;
}

/**
 * The crash history, as the server last answered it.
 *
 * It has **no cache and no live growth**: every instance starts empty, sees
 * only the `game-history` events after its own mount, and does not react to
 * `crash-history-item`. Merging the live crashes in is the skin's job — see
 * `useCrashHistory`.
 */
const GAME_HISTORY: GameHistoryReturn = Object.freeze({
  items: Object.freeze([]) as readonly GameHistoryItem[],
  fetch: noop,
});

export function useGameHistory(): GameHistoryReturn {
  return GAME_HISTORY;
}

export interface MyBetsReturn {
  rounds: readonly MyHistoryRound[];
  /** Total rows on the server, for paging. */
  total: number;
  fetch: (limit?: number, offset?: number) => void;
}

/** Module-level cache in the real hook — a remount shows the last data at once. */
const MY_BETS: MyBetsReturn = Object.freeze({
  rounds: Object.freeze([]) as readonly MyHistoryRound[],
  total: 0,
  fetch: noop,
});

export function useMyBets(): MyBetsReturn {
  return MY_BETS;
}
