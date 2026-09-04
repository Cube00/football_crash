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
 * Every shape below is transcribed from the integration documentation kept in
 * `.claude/sdk-docs/` — chiefly `07-events.md` (payload interfaces, verbatim),
 * `06-hooks-reference.md` (`GameConfig`, `ClientConfig`) and `12-contexts.md`
 * (the context types). Where the docs give a wire field name it is kept in the
 * comment, because the wire is where a rename would first show up.
 *
 * String *values* of the enums below are the skin's own where the docs only
 * name the members (`BetButtonVariant`); they are never serialised, only
 * compared, so they cost nothing if the SDK spells them differently.
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

/** The two independent bet panels. Server slots are 1/2 — the SDK converts. */
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
 * next `BETTING_OPEN`. It is written to storage but never read back, so it does
 * not survive a refresh (`02-configuration.md`).
 */
export const BetState = {
  Idle: "idle",
  Placed: "placed",
  Active: "active",
  Won: "won",
  Lost: "lost",
} as const;

export type BetState = (typeof BetState)[keyof typeof BetState];

/** One or two bet panels on screen. Default `Double`; persisted by the SDK. */
export const BetLayout = {
  Single: "single",
  Double: "double",
} as const;

export type BetLayout = (typeof BetLayout)[keyof typeof BetLayout];

/**
 * Connection states reported by `useConnectionStatus()`.
 *
 * `Connected` arrives twice per connect — once on the socket, once on
 * JoinCrashOk — with `Checking` between them. "Ready for the game" is the
 * second one (`07-events.md`).
 */
export const ConnectionState = {
  Connected: "connected",
  Disconnected: "disconnected",
  Checking: "checking",
} as const;

export type ConnectionState =
  (typeof ConnectionState)[keyof typeof ConnectionState];

/**
 * Launch lifecycle. A string union in the SDK (`KrashLaunchStatus`), not an
 * enum — the const object below is only a spelling aid for the four values.
 *
 * `Ready` means "REST launch finished, socket connect started" — *not* that the
 * game can be played. Gate the skin on `Ready` **and** a connected socket
 * **and** a non-null `GameConfig` (`01-getting-started.md`).
 */
export const LaunchStatus = {
  Idle: "idle",
  Loading: "loading",
  Ready: "ready",
  Error: "error",
} as const;

export type LaunchStatus = (typeof LaunchStatus)[keyof typeof LaunchStatus];

/** How other players' bets are priced in the feed. Server-driven. */
export type CurrencyMode = "single" | "multi";

/** Device class, as decided by the SDK's own runtime detect. */
export const Platform = {
  Mob: "mobile",
  Desk: "desktop",
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

/** Languages the SDK's `LanguageProvider` recognises in `?lang`. */
export const Language = {
  DE: "de",
  EN: "en",
  ES: "es",
  FR: "fr",
  HI: "hi",
  ID: "id",
  IT: "it",
  JA: "ja",
  KA: "ka",
  PT: "pt",
  PT_BR: "pt-BR",
  RU: "ru",
} as const;

export type Language = (typeof Language)[keyof typeof Language];

/**
 * The three switches `SettingsProvider` persists. All default to `true`.
 *
 * A type alias rather than an interface so it keeps an implicit index
 * signature: the settings menu is a generic list keyed by row id, and an
 * interface would not be assignable to it.
 */
export type GameSettings = {
  sound: boolean;
  music: boolean;
  animation: boolean;
};

/* ── Session ─────────────────────────────────────────────────────────── */

/** What the REST launch exchange returns. */
export interface LaunchSession {
  sessionToken: string;
  gameId: string;
  mode: string;
  currency: string;
  lang?: string;
  platform?: string;
  heartbeatIntervalSeconds?: number;
  oneShotToken?: string;
  /** True when the session was reused from storage on a refresh. */
  restoredFromStorage?: boolean;
}

/* ── Betting ─────────────────────────────────────────────────────────── */

/**
 * The nine states the primary button can be in. Computed by the SDK's
 * `computeButtonVariant()` — a pure function of phase, bet state, in-flight
 * flags, the freeze detector and whether auto-play is running. The UI renders
 * it and never derives it.
 *
 * Three of them are never returned (`04-betting.md`): `Sending` — the SDK shows
 * `Cancel` disabled instead; `Cancelling` — same, the computed variant stays
 * and only `disabled` flips; `Freebet` — skin policy, the panel substitutes it
 * for `Bet` while a grant is bound.
 */
export const BetButtonVariant = {
  /** Idle — "Place Bet". */
  Bet: "bet",
  /** Never returned by the SDK. */
  Sending: "sending",
  /** A placed or pending bet can still be pulled — "Cancel". */
  Cancel: "cancel",
  /** Waiting out the round: pending bet, or auto-play between rounds. */
  CancelWaiting: "cancel-waiting",
  /** Active in FLYING — "Cashout X.XXx". */
  Cashout: "cashout",
  /** Cashout in flight — disabled. */
  CashingOut: "cashing-out",
  /** Never returned by the SDK. */
  Cancelling: "cancelling",
  /** Lost, CRASHED — disabled. */
  Lost: "lost",
  /** Never returned by the SDK — the skin substitutes it for `Bet`. */
  Freebet: "freebet",
} as const;

export type BetButtonVariant =
  (typeof BetButtonVariant)[keyof typeof BetButtonVariant];

export interface PlayerBet {
  /** Server bet id. `''` on a bet restored from `RoundMyBets`. */
  id: string;
  amount: number;
  state: BetState;
  /** Multiplier the bet cashed out at. `Won` only. */
  cashedOutAt?: number;
  /** `Won` only. */
  payout?: number;
  /** Set when the bet was staked from a freeround grant. */
  freeroundGrantId?: string;
}

/**
 * One slot, as the store holds it.
 *
 * `isCashingOut` and `isCancelling` are deliberately absent — they are internal
 * engine flags and reach the UI only through `buttonVariant`/`isButtonDisabled`.
 */
export interface SlotSnapshot {
  bet: PlayerBet | null;
  /** Input field value. Default 5; persisted per user+game by the SDK. */
  betInputAmount: number;
  /** Queued — will be sent on the next BETTING_OPEN. */
  hasPendingBet: boolean;
  /**
   * PlaceBet went out but no `BetPlaced` arrived before FLYING. Auto-clears
   * after 3 s. **Not** "the server rejected it" — that is `bet-error`.
   */
  betFailed: boolean;
  buttonVariant: BetButtonVariant;
  isButtonDisabled: boolean;
  /** PlaceBet sent, ACK outstanding. Times out after 5 s. */
  isSending: boolean;
}

export interface PlaceBetOptions {
  /**
   * Server-side auto-cashout. The server performs the cashout at this
   * multiplier and sends a normal `CashoutDone`. Sent only when `> 1.0`.
   */
  autoCashoutAt?: number;
}

/* ── Game config (from the server) ───────────────────────────────────── */

/** One operator-configured button. `title` is a label — never parse it. */
export interface ClientConfigButton {
  /** Stable id, for selection state and analytics. */
  key: string;
  title: string;
  /** All calculations run off this. */
  value: number;
}

/** Present only when the operator has configured it for game + currency. */
export interface ClientConfig {
  /** Schema version, currently 1. */
  version: number;
  defaultBet: number;
  defaultAutoCashout: number;
  /** Step of the +/- buttons. Use 1 when absent. */
  betStep?: number;
  /** A single stake-multiply button, e.g. x2. */
  multiplyButton: ClientConfigButton;
  /** Quick-bet presets — the server sends exactly 3, in array order. */
  speedButtons: ClientConfigButton[];
}

/**
 * The `game-config` response. The SDK stores it and does nothing with it: the
 * limits are not enforced, the buttons are not drawn, the defaults are not
 * applied. All of that is the skin's.
 */
export interface GameConfig {
  minBet: number;
  maxBet: number;
  maxWinAmount: number;
  maxBetsPerUser: number;
  /** Empty from the server becomes `'USD'`. */
  currencyCode: string;
  hasMoreOptions: boolean;
  /** Decimal places for every amount. `0` from the server becomes `2`. */
  currencyMinorUnits: number;
  clientConfig?: ClientConfig;
  /** Epoch ms; the revision id of `clientConfig`. Arrives with it. */
  configUpdatedAt?: number;
}

/* ── Auto-play ───────────────────────────────────────────────────────── */

export interface StopCondition {
  enabled: boolean;
  amount: number;
}

export interface AutoPlayConfig {
  /** Stored but never read by the engine — a free field for the UI. */
  isEnabled: boolean;
  /** Last selected round count; written by `start()` / `selectRounds()`. */
  rounds: number;
  autoCashOut: {
    enabled: boolean;
    /** Sent as `autoCashoutAt`; ignored at or below 1.0. */
    multiplier: number;
  };
  /** Stop once `startingBalance - balance >= amount`. */
  stopOnCashDecrease: StopCondition;
  /** Stop once `balance - startingBalance >= amount`. */
  stopOnCashIncrease: StopCondition;
  /** Stop once the last win's profit >= amount. */
  stopOnSingleWin: StopCondition;
}

export const AutoPlayStopReason = {
  Completed: "COMPLETED",
  CashDecreased: "CASH_DECREASED",
  CashIncreased: "CASH_INCREASED",
  SingleWinExceeded: "SINGLE_WIN_EXCEEDED",
  ManualStop: "MANUAL_STOP",
  /** Only ever a zero wallet balance at the start of a round. */
  Error: "ERROR",
  /**
   * The bound grant ran out. The SDK stops auto-play itself so the player's
   * real money is never used as a fallback — never stop it by hand for this.
   * It does **not** fire on an expired or cancelled grant; there the skin must
   * stop auto-play when `isActive` goes false.
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
 * `Fixed` — every bet costs `betAmount`; the player's input is ignored by the
 * SDK, which substitutes the grant's amount.
 * `Range` — the player picks. The SDK does **not** clamp to `[betMin, betMax]`;
 * that is the skin's job.
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
  /** What the wallet started at. Y in the X/Y badge. */
  balanceInitial: number;
  roundsPlayed: number;
  kind: FreeroundKind;
  /** The fixed stake; for a range grant this equals `betMin`. */
  betAmount: number;
  betMin: number;
  betMax: number;
  /** Floor for cashout. Defaults to 1.01. The SDK does not enforce it. */
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
 * Never look the active grant up in the grants list: `GetFreerounds` returns
 * only `AVAILABLE` ones, and on exhaustion the SDK drops it from the list while
 * this slice is still live. A `grants.find(...)` would come back undefined and
 * drop the panel out of freebet mode with a bet still in flight.
 */
export interface FreeroundState {
  grantId: string;
  status: FreeroundStatus;
  balanceRemaining: number;
  balanceInitial: number;
  roundsPlayed: number;
  betAmount: number;
  minCashout: number;
  /** `status === 'IN_PROGRESS'` — bets carry the grantId while true. */
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
  /** Older server builds omit it; treat a missing value as COMPLETED. */
  reason?: FreeroundEndReason;
}

export interface FreeroundHistoryEntry {
  grantId: string;
  status: Exclude<FreeroundStatus, "AVAILABLE" | "IN_PROGRESS">;
  kind: FreeroundKind;
  totalWin: number;
  roundsPlayed: number;
  freeRoundBalance: number;
  /** ISO timestamp. */
  completedAt: string;
  /** ISO timestamp, mainly on EXPIRED entries. */
  expiryDate?: string;
  minCashout?: number;
}

export interface FreeroundHistoryPayload {
  entries: FreeroundHistoryEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
}

/* ── Event payloads ──────────────────────────────────────────────────── */

/** Arrives in every phase; roughly every 100 ms in FLYING. */
export interface TickPayload {
  multiplier: number;
  phase: GamePhase;
  /** `''` when the server omits it. */
  roundId: string;
  /** Remaining time of the *current* phase. `0` when absent. */
  remainingMs: number;
  /** Arrives in the CRASHED tick. */
  fairnessHash?: string;
  /** Arrives in the CRASHED tick. */
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

export interface UsernamePayload {
  username: string;
}

export interface BetPlacedPayload {
  /** Already converted to {@link BetSlot} (0/1), unlike `BetUpdatePayload.slot`. */
  slotIndex: number;
  amount: number;
  currency: string;
  betId: string;
  balance?: number;
  /** wire: `freeround_grant_id` */
  freeroundGrantId?: string;
  /** wire: `freeround_balance_remaining` */
  freeroundBalanceRemaining?: number;
  /** The grant's balance is spent. A UX hint only — no `totalWin` yet. */
  freeroundCompleted?: boolean;
}

export interface CashoutDonePayload {
  slotIndex: number;
  multiplier: number;
  payout: number;
  /** Falls back to `payout / multiplier` when the server omits it. */
  betAmount: number;
  balance?: number;
  freeroundGrantId?: string;
  /** `"BET"` or `"FREEBET"`; absent on legacy backends. */
  betType?: string;
  /** `"ZERO_BET"` or `"BET_FROM_WIN"`; absent for cash bets. */
  betMode?: string;
}

export interface CancelBetOkPayload {
  slotIndex: number;
  betId: string;
  balance?: number;
  freeroundGrantId?: string;
  /** The server's refund figure; absent means restore optimistically. */
  freeroundBalanceRemaining?: number;
}

/**
 * Another player's bet, as broadcast to the feed.
 *
 * The same `betId` arrives several times as the bet progresses, so a feed has
 * to upsert rather than append. `status` is not typed by the SDK — `CANCELLED`
 * means remove the row; a payout above zero is the reliable "won" test.
 */
export interface BetUpdatePayload {
  betId: string;
  amount: number;
  /** Empty falls back to the game currency. */
  currency: string;
  /** Missing becomes `'ACTIVE'`. */
  status: string;
  /** Often `''` — fall back to `userId`, then `fakeIdentifier`. */
  username: string;
  /** Stable per player per round; how the feed spots the player's own row. */
  fakeIdentifier: string;
  userId?: number;
  /** The **server's** 1/2, not a {@link BetSlot}. */
  slot?: number;
  cashedOutAt?: number;
  payout?: number;
  autoCashoutAt?: number;
  /** Compare against the last tick's round to drop stale rows. */
  roundId?: string;
}

/** The player's own bets in the current round; sent on every ROOM_JOIN. */
export interface RoundMyBetsPayload {
  roundId: string;
  bets: Array<{
    slotIndex: number;
    amount: number;
    /** `'PLACED' | 'ACTIVE' | 'CASHED_OUT' | …` */
    status: string;
    freeroundGrantId?: string;
    cashedOutAt?: number;
    payout?: number;
  }>;
}

/** Generated locally from the CRASHED tick — it does not wait for the server. */
export interface CrashHistoryItemPayload {
  roundId: string;
  crashAt: number;
  fairnessHash?: string;
  serverSeed?: string;
  /** `Date.now()` at the crash. */
  timestamp: number;
}

/** One finished round, as `getHistory()` returns it. */
export interface GameHistoryItem {
  roundId: string;
  /** The crash multiplier — not a date. */
  crashAt: number;
  fairnessHash: string;
  serverSeed: string;
  /** Round start, epoch ms. */
  startTimeMs: number;
}

/**
 * One row of the player's own history. Each ticket is its own entry, with
 * `roundId` suffixed `-ticket-<n>`, and `bets` always holds exactly one.
 */
export interface MyHistoryRound {
  roundId: string;
  /** ISO timestamp; wire: `ticket.createdAt`. */
  timestamp: string;
  totalBet: number;
  totalWin: number;
  crashMultiplier: number;
  bets: Array<{
    /** `'freebet' | 'classic'`. */
    betType: string;
    /** `winAmount / betAmount`, or 0 when the bet lost. */
    multiplier: number;
    betAmount: number;
    /** Equals the win amount. */
    netCash: number;
    /** The server's 1/2; index + 1 when absent. */
    slot?: number;
  }>;
}

export interface MyHistoryPayload {
  rounds: MyHistoryRound[];
  total: number;
  limit: number;
  offset: number;
}

export interface AutoPlayStopPayload {
  slot: BetSlot;
  reason: AutoPlayStopReason;
}

/** A round whose result was missed, typically across a reconnect gap. */
export interface MissedRoundBetsPayload {
  bets: Array<{ slotIndex: number; amount: number; state: BetState }>;
}

/** A server rejection carrying a slot. Does **not** change slot state. */
export interface BetErrorPayload {
  slotIndex: number;
  error: string;
}

/** The SDK's typed event map — all 30 events. */
export interface GameEventMap {
  /* Game state */
  tick: TickPayload;
  "phase-change": PhaseChangePayload;
  crash: CrashPayload;
  "crash-history-item": CrashHistoryItemPayload;
  "game-frozen": { frozen: boolean };
  balance: BalancePayload;
  username: UsernamePayload;
  "game-config": GameConfig;
  "currency-mode": { mode: CurrencyMode };

  /* Betting */
  "bet-placed": BetPlacedPayload;
  "cashout-done": CashoutDonePayload;
  "cancel-bet-ok": CancelBetOkPayload;
  "bet-update": BetUpdatePayload;
  "round-my-bets": RoundMyBetsPayload;
  "bet-error": BetErrorPayload;
  "missed-round-bets": MissedRoundBetsPayload;
  /** Declared by the SDK but never emitted — read slots from the store. */
  "slot-state-change": { slot: BetSlot; state: SlotSnapshot };

  /* History */
  "game-history": GameHistoryItem[];
  "my-history": MyHistoryPayload;

  /* Free rounds */
  "freeround-state": FreeroundState | null;
  "freeround-list": { grants: FreeroundGrant[] };
  "freeround-history": FreeroundHistoryPayload;
  /** A UX hint. It carries no `totalWin` — that is `freeround-summary`. */
  "freeround-completed": { grantId: string };
  "freeround-summary": FreeroundSummaryPayload;

  /* Connection */
  "connection-change": { state: ConnectionState };
  "server-connected": undefined;
  "session-expired": undefined;
  "ping-pong": { lagValue: number };
  error: { message: string };

  /* Auto-play */
  "autoplay-stop": AutoPlayStopPayload;
}

export type GameEventName = keyof GameEventMap;
