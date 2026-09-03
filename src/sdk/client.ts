import type {
  BetLayout,
  BetSlot,
  GameEventMap,
  GameEventName,
  LaunchSession,
  PlaceBetOptions,
} from "./types";

/**
 * The slice of `KrashClient` this skin uses.
 *
 * TEMPORARY — see `types.ts`. Once `@krash/react` is installed, `useKrashClient()`
 * returns the real client and this interface can be replaced by the SDK's own.
 * Signatures are transcribed from `.claude/sdk-docs/16-krashclient-api.md`, so
 * callers do not change.
 *
 * Not mirrored here, because nothing in the skin needs them yet: `launch`,
 * `destroy`, `store`, `clientConfig`, `getAutoPlay`, `getLaunchService`. Add a
 * method when a call site appears — not before.
 */
export interface KrashClient {
  /** Subscribe to a typed event. Returns an unsubscribe function. */
  on<E extends GameEventName>(
    event: E,
    handler: (payload: GameEventMap[E]) => void,
  ): () => void;

  off<E extends GameEventName>(
    event: E,
    handler: (payload: GameEventMap[E]) => void,
  ): void;

  /* Betting */
  placeBet(slot: BetSlot, amount: number, options?: PlaceBetOptions): void;
  cashout(slot: BetSlot): void;
  cancelBet(slot: BetSlot): void;
  /** The input value, unvalidated and persisted. Auto-play bets read it. */
  setBetInputAmount(slot: BetSlot, amount: number): void;
  setBetLayout(layout: BetLayout): void;
  /** Clears `winAmount`/`winTimestamp` — the win toast closing. */
  clearWin(): void;

  /** Required after `engine.start()`: `start` does not touch the store. */
  notifyAutoPlayChanged(): void;

  /* Free rounds */
  bindFreeround(grantId: string): void;
  unbindFreeround(): void;
  /** Heavy server-side; the response holds AVAILABLE grants only. */
  getFreerounds(): void;
  getFreeroundHistory(page?: number, pageSize?: number): void;
  acknowledgeFreeroundSummary(): void;

  /* History — both answer with an event, neither writes the store */
  getHistory(limit?: number): void;
  getMyHistory(limit?: number, offset?: number): void;

  /** The launch session; `sessionToken` for `fetchRecoveryBets`. */
  getSession(): LaunchSession | null;
}

const noop = () => {};

/**
 * Stands in for the real client until the SDK is installed.
 *
 * Every method is inert on purpose: this build has no server, and nothing in
 * the skin may simulate one. `on()` hands back a working unsubscribe so the
 * bridge's cleanup path is exercised exactly as it will be in production.
 */
export const placeholderClient: KrashClient = {
  on: () => noop,
  off: noop,
  placeBet: noop,
  cashout: noop,
  cancelBet: noop,
  setBetInputAmount: noop,
  setBetLayout: noop,
  clearWin: noop,
  notifyAutoPlayChanged: noop,
  bindFreeround: noop,
  unbindFreeround: noop,
  getFreerounds: noop,
  getFreeroundHistory: noop,
  acknowledgeFreeroundSummary: noop,
  getHistory: noop,
  getMyHistory: noop,
  getSession: () => null,
};
