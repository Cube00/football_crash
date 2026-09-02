/**
 * Mirrors of the types `@krash/sdk` exports.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TEMPORARY. Every declaration here exists only because the SDK packages are
 * not installed yet. When they land:
 *
 *     pnpm add @krash/sdk @krash/react sfs2x-api
 *
 * this file becomes a re-export and nothing else in `src/` changes:
 *
 *     export type { ... } from "@krash/sdk";
 *     export { GamePhase, BetSlot, BetState, BetButtonVariant, ... } from "@krash/sdk";
 *
 * Nothing here may grow behaviour. It is shapes and constants only — no round
 * loop, no RNG, no balance arithmetic, no persistence. All of that is the SDK's.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Shapes marked `UNDOCUMENTED` are not spelled out in the integration docs;
 * they are our best reading of the prose and must be checked against the real
 * package before anyone relies on a field.
 */

/* ── Game state ──────────────────────────────────────────────────────── */

/** Lifecycle of a single crash round. Server-driven; the UI never infers it. */
export const GamePhase = {
  BettingOpen: "BETTING_OPEN",
  BettingClosing: "BETTING_CLOSING",
  Flying: "FLYING",
  Crashed: "CRASHED",
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

/** The two independent bet panels. */
export const BetSlot = {
  Slot1: 0,
  Slot2: 1,
} as const;

export type BetSlot = (typeof BetSlot)[keyof typeof BetSlot];

/**
 * State of one bet.
 *
 * Note there is no `Queued`: a bet placed outside the betting window is not a
 * state but a flag — `SlotSnapshot.hasPendingBet`, which the SDK sends on the
 * next `BETTING_OPEN` and persists across a refresh.
 */
export const BetState = {
  Idle: "idle",
  Placed: "placed",
  Active: "active",
  Won: "won",
  Lost: "lost",
} as const;

export type BetState = (typeof BetState)[keyof typeof BetState];

/** One or two bet panels on screen. Persisted per user by the SDK. */
export const BetLayout = {
  Single: "single",
  Double: "double",
} as const;

export type BetLayout = (typeof BetLayout)[keyof typeof BetLayout];

/** Connection states reported by `useConnectionStatus()`. */
export const ConnectionState = {
  Connected: "connected",
  Disconnected: "disconnected",
  Checking: "checking",
} as const;

export type ConnectionState =
  (typeof ConnectionState)[keyof typeof ConnectionState];

/** Launch lifecycle, gating the whole visual layer. */
export const LaunchStatus = {
  Loading: "loading",
  Ready: "ready",
  Error: "error",
} as const;

export type LaunchStatus = (typeof LaunchStatus)[keyof typeof LaunchStatus];

/* ── Betting ─────────────────────────────────────────────────────────── */

/**
 * The nine states the primary button can be in. Computed by the SDK's
 * `computeButtonVariant()` — a pure function of phase + bet state + flags.
 * The UI must render this, never derive it.
 */
export const BetButtonVariant = {
  /** Idle, BETTING_OPEN — "Place Bet". */
  Bet: "bet",
  /** PlaceBet sent, awaiting the server — disabled. */
  Sending: "sending",
  /** Placed, BETTING_OPEN — "Cancel". */
  Cancel: "cancel",
  /** Placed/pending in FLYING/CRASHED, or auto-play running — disabled. */
  CancelWaiting: "cancel-waiting",
  /** Active, FLYING — "Cashout X.XXx". */
  Cashout: "cashout",
  /** Cashout in flight — disabled. */
  CashingOut: "cashing-out",
  /** Cancel in flight — disabled. */
  Cancelling: "cancelling",
  /** Lost, CRASHED — disabled. */
  Lost: "lost",
  /** An active freeround grant is bound. */
  Freebet: "freebet",
} as const;

export type BetButtonVariant =
  (typeof BetButtonVariant)[keyof typeof BetButtonVariant];

export interface PlayerBet {
  /** Server bet id. */
  id: string;
  amount: number;
  state: BetState;
  /** Multiplier the bet cashed out at. */
  cashedOutAt?: number;
  payout?: number;
  /** Set when the bet was staked from a freeround grant. */
  freeroundGrantId?: string;
}

export interface SlotSnapshot {
  bet: PlayerBet | null;
  /** Input field value. Persisted per session token by the SDK. */
  betInputAmount: number;
  /** Queued — will send on the next BETTING_OPEN. */
  hasPendingBet: boolean;
  /** The server rejected the bet. */
  betFailed: boolean;
  buttonVariant: BetButtonVariant;
  isButtonDisabled: boolean;
  /** PlaceBet sent, response outstanding. */
  isSending: boolean;
}

export interface PlaceBetOptions {
  /** Server-enforced auto-cashout multiplier for this bet. */
  autoCashoutAt?: number;
}

/* ── Auto-play ───────────────────────────────────────────────────────── */

export interface StopCondition {
  enabled: boolean;
  amount: number;
}

export interface AutoPlayConfig {
  isEnabled: boolean;
  rounds: number;
  autoCashOut: {
    enabled: boolean;
    multiplier: number;
  };
  /** Stop once the balance has dropped by this much. */
  stopOnCashDecrease: StopCondition;
  /** Stop once the balance has grown by this much. */
  stopOnCashIncrease: StopCondition;
  /** Stop when any single win exceeds this. */
  stopOnSingleWin: StopCondition;
}

export const AutoPlayStopReason = {
  Completed: "COMPLETED",
  CashDecreased: "CASH_DECREASED",
  CashIncreased: "CASH_INCREASED",
  SingleWinExceeded: "SINGLE_WIN_EXCEEDED",
  ManualStop: "MANUAL_STOP",
  Error: "ERROR",
  /**
   * The bound grant ran out. The SDK stops auto-play itself so the player's
   * real money is never used as a fallback — never stop it by hand.
   */
  FreeroundCompleted: "FREEROUND_COMPLETED",
} as const;

export type AutoPlayStopReason =
  (typeof AutoPlayStopReason)[keyof typeof AutoPlayStopReason];

/* ── Free rounds (free bets) ─────────────────────────────────────────── */

export const FreeroundStatus = {
  Available: "AVAILABLE",
  InProgress: "IN_PROGRESS",
  Completed: "COMPLETED",
  Expired: "EXPIRED",
  Cancelled: "CANCELLED",
} as const;

export type FreeroundStatus =
  (typeof FreeroundStatus)[keyof typeof FreeroundStatus];

/**
 * How a grant's stake is chosen.
 *
 * `Fixed` — every bet costs `betAmount`; the player's input is ignored.
 * `Range` — the player picks any amount in `[betMin, betMax]`.
 */
export const FreeroundKind = {
  Fixed: "fixed",
  Range: "range",
} as const;

export type FreeroundKind = (typeof FreeroundKind)[keyof typeof FreeroundKind];

/** Why a grant ended. Drives the copy in the completion modal. */
export const FreeroundEndReason = {
  Completed: "COMPLETED",
  Expired: "EXPIRED",
  Cancelled: "CANCELLED",
} as const;

export type FreeroundEndReason =
  (typeof FreeroundEndReason)[keyof typeof FreeroundEndReason];

export interface FreeroundGrant {
  grantId: string;
  status: FreeroundStatus;
  /** The freebet wallet, in currency — not a ticket count. */
  balanceRemaining: number;
  roundsPlayed: number;
  kind: FreeroundKind;
  /** Required for fixed; equals `betMin` for range. */
  betAmount: number;
  betMin: number;
  betMax: number;
  /** Cashout is blocked below this multiplier. Defaults to 1.5. */
  minCashout: number;
  /** ISO timestamp. */
  expiresAt?: string;
  /** ISO timestamp — when the grant was credited. */
  accruedAt?: string;
  /** Raw JSON, for debugging only. */
  betConfigRaw?: string;
}

/**
 * The bound grant — the single source of truth while one is active.
 *
 * Never look the active grant up in the grants list: after exhaustion the
 * server drops it from that list while this slice is still live, and a
 * `grants.find(...)` would return undefined and drop the panel back to
 * real-money mode with a freebet still in flight.
 */
export interface FreeroundState {
  grantId: string;
  status: FreeroundStatus;
  balanceRemaining: number;
  roundsPlayed: number;
  betAmount: number;
  minCashout: number;
  /** `status === 'IN_PROGRESS'`. */
  isActive: boolean;
  kind: FreeroundKind;
  betMin: number;
  betMax: number;
}

/** The server's authoritative close-out. `totalWin` exists only here. */
export interface FreeroundSummaryPayload {
  grantId: string;
  roundsPlayed: number;
  balanceUsed: number;
  /** Can be > 0 when EXPIRED — the leftover stake is forfeit. */
  balanceRemaining: number;
  totalWin: number;
  /** Older server builds may omit it; treat a missing value as COMPLETED. */
  reason?: FreeroundEndReason;
}

export interface FreeroundHistoryEntry {
  grantId: string;
  status: Exclude<FreeroundStatus, "AVAILABLE" | "IN_PROGRESS">;
  kind: FreeroundKind;
  totalWin: number;
  roundsPlayed: number;
  freeRoundBalance: number;
  completedAt: string;
  /** ISO timestamp, mainly on EXPIRED entries. */
  expiryDate?: string;
  minCashout?: number;
}

/* ── Event payloads ──────────────────────────────────────────────────── */

export interface TickPayload {
  multiplier: number;
  phase: GamePhase;
  roundId: string;
  /** Only meaningful in BETTING_OPEN — it is the countdown. */
  remainingMs: number;
  fairnessHash?: string;
  serverSeed?: string;
}

export interface PhaseChangePayload {
  phase: GamePhase;
  roundId: string;
}

export interface CrashPayload {
  multiplier: number;
}

export interface BalancePayload {
  balance: number;
}

export interface BetPlacedPayload {
  /**
   * Server slot — documented as 1 or 2, while {@link BetSlot} is 0 or 1.
   * Convert at the edge; do not compare the two directly.
   */
  slotIndex: number;
  amount: number;
  currency: string;
  betId: string;
  balance?: number;
  freeroundGrantId?: string;
  freeroundBalanceRemaining?: number;
  /** The grant's balance is spent. A UX hint only — no `totalWin` yet. */
  freeroundCompleted?: boolean;
}

export interface CashoutDonePayload {
  slotIndex: number;
  multiplier: number;
  payout: number;
  betAmount: number;
  balance?: number;
}

export interface CancelBetOkPayload {
  slotIndex: number;
  betId: string;
  balance?: number;
  freeroundGrantId?: string;
  freeroundBalanceRemaining?: number;
}

/** UNDOCUMENTED — another player's bet, as broadcast to the feed. */
export interface BetUpdatePayload {
  betId: string;
  /** Masked handle, e.g. `G****t`. */
  username: string;
  amount: number;
  currency: string;
  state: BetState;
  cashedOutAt?: number;
  payout?: number;
  own?: boolean;
}

export interface CrashHistoryItemPayload {
  roundId: string;
  crashAt: number;
  fairnessHash?: string;
  serverSeed?: string;
  timestamp: string;
}

/** UNDOCUMENTED — one row of `getHistory()`. */
export interface GameHistoryItem {
  roundId: string;
  crashAt: number;
  fairnessHash?: string;
  serverSeed?: string;
  timestamp?: string;
}

/** UNDOCUMENTED — one of the player's own settled bets. */
export interface MyHistoryRound {
  roundId: string;
  betId: string;
  amount: number;
  currency: string;
  state: BetState;
  cashedOutAt?: number;
  payout?: number;
  timestamp?: string;
}

/** UNDOCUMENTED — shape of `game-config`. */
export interface GameConfig {
  currency: string;
  minBet: number;
  maxBet: number;
  defaultBet?: number;
  /** Quick-stake chips, when the server supplies them. */
  quickAmounts?: readonly number[];
}

export interface AutoPlayStopPayload {
  slot: BetSlot;
  reason: AutoPlayStopReason;
}

export interface SlotStateChangePayload {
  slot: BetSlot;
  state: SlotSnapshot;
}

/**
 * The SDK's typed event map — the subset the visual layer subscribes to.
 * Extend as the canvas and sound layers need more; the full map is 29 events.
 */
export interface GameEventMap {
  tick: TickPayload;
  "phase-change": PhaseChangePayload;
  crash: CrashPayload;
  balance: BalancePayload;
  "game-frozen": { frozen: boolean };
  "game-config": GameConfig;
  "bet-placed": BetPlacedPayload;
  "cashout-done": CashoutDonePayload;
  "cancel-bet-ok": CancelBetOkPayload;
  "bet-update": BetUpdatePayload;
  "crash-history-item": CrashHistoryItemPayload;
  "freeround-state": FreeroundState | null;
  "freeround-completed": { grantId: string };
  "freeround-summary": FreeroundSummaryPayload;
  "autoplay-stop": AutoPlayStopPayload;
  "slot-state-change": SlotStateChangePayload;
  "connection-change": { state: ConnectionState };
  error: { message: string };
}

export type GameEventName = keyof GameEventMap;
