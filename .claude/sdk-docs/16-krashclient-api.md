<!-- source: https://krash-sdk-docs.playcore.live/en/16-krashclient-api/ -->

# 16. KrashClient API — vanilla reference

The full public API of `@krash/sdk` without React: every `KrashClient` property/method, `KrashStore`, `AutoPlayEngine`, `computeButtonVariant`, `fetchRecoveryBets`, `LaunchService`, platform helpers, logger and the full export list of `index.ts`. At the end of the chapter — a working vanilla example. All signatures are from `packages/sdk/src` (file:line is given).

Table convention: name | signature | semantics | store/events/note.

## `KrashClient`

`core/KrashClient.ts`. One instance = one session + one socket. `KrashProvider` creates exactly this in a `useRef`.
```
import * as SFS2X from 'sfs2x-api';
import { KrashClient } from '@krash/sdk';

const client = new KrashClient(config /* KrashConfig */);
const session = await client.launch(SFS2X, url?);

```

The constructor (`:50-214`) synchronously creates the store and the engines and wires up the events; nothing network-related happens. `setDebugEnabled(config.debug ?? autoDetectDebug())` runs here as well.

### Properties

| Name | Type | Semantics |
| `store` | `readonly KrashStore` | reactive state — see §KrashStore |
| `clientConfig` | `readonly KrashConfig` | the object passed to the constructor, unchanged |

### Lifecycle

| Method | Signature | Semantics | Store / events |
| `launch` | `(sfs2xModule: typeof import('sfs2x-api'), url?: string) => Promise<LaunchSession>` | `console.log('[Krash SDK] v…')`; `LaunchService.launch(url)` (exchange / stored session / demo); `setIsDemo`, `setOnDemoRelaunch`; currency → `BettingEngine`; `ConnectionManager.connect()` — **starts** the socket connect. The Promise resolves as soon as the connect is started, it does not wait for login. After `destroy()` it throws `Error('KrashClient is destroyed')`. REST errors (exchange `result_code !== 0`, demo error) — reject | `connectionState: 'disconnected'` at the start of connect; then SFS events (01 — launch flow) |
| `destroy` | `() => void` | idempotent. Both `AutoPlayEngine.reset()` (the config's autoCashOut stays, everything else is zeroed and **persisted**), `BettingEngine.destroy()` (timeouts, listeners), `GameEngine.destroy()` (freeze timer), `ConnectionManager.destroy()` (`disconnect` + reconnect timer), `emitter.removeAll()`. The store is **not** reset | `isGameFrozen: false`, if it was frozen. `'autoplay-stop'` is **not** emitted (`reset` does not emit) |

`disconnect()`/`reconnect()` **do not exist**. Closing the socket = `destroy()` and a new `KrashClient`.

### Betting

| Method | Signature | Semantics | Store / events |
| `placeBet` | `(slot: BetSlot, amount: number, opts?: { autoCashoutAt?: number }) => void` | BETTING_OPEN and the slot is empty → `PlaceBet { amount, currency, slot: 1\|2, autoCashoutAt? (>1.0), grantId? }` immediately, `isSending`, 5000 ms timeout. Otherwise → pending (if there is no pending yet; a second call is ignored). Fixed freeround → `amount` is replaced with the grant's `betAmount`. No validation is performed | `slots[slot]` (`isSending` / `hasPendingBet`, `buttonVariant`). Response: `'bet-placed'` → `bet`, `'balance'`; `'error'`/`'bet-error'` on server rejection |
| `cashout` | `(slot: BetSlot) => void` | `Cashout { slot }` is **always** sent; `isCashingOut` + 3000 ms only on an `Active` bet | `slots[slot].buttonVariant = CashingOut`. Response `'cashout-done'` → `bet.state = Won`, `winAmount`, `winTimestamp`, `balance` |
| `cancelBet` | `(slot: BetSlot) => void` | pending → removed locally, nothing on the server; `Placed`/`Active` → `isCancelling` + 3000 ms + `CancelBet { slot }`; `Idle`/`Won`/`Lost` → no-op | `slots[slot]`. Response `'cancel-bet-ok'` → `bet = null`, `balance`; on a free bet `'freeround-state'` (balance restore) |
| `setBetLayout` | `(layout: BetLayout) => void` | UI flag; does not affect the second slot's bet; persisted | `betLayout` |
| `setBetInputAmount` | `(slot: BetSlot, amount: number) => void` | the input value, without validation; persisted (`betInputAmounts`) | `slots[slot].betInputAmount` |
| `clearWin` | `() => void` | closing the win toast | `winAmount = null`, `winTimestamp = 0` |

### Auto-play

| Method | Signature | Semantics | Note |
| `getAutoPlay` | `(slot: BetSlot) => AutoPlayEngine` | the slot's engine — see §AutoPlayEngine | the same instance on every call |
| `notifyAutoPlayChanged` | `() => void` | `BettingEngine.forceSyncStore()` — recomputes the button variants with `isAutoPlayActive` | **Required** after `engine.start()` — start itself does not touch the store. `stop()` emits `'autoplay-stop'` and KrashClient syncs automatically |

### History

| Method | Signature | Semantics | Response |
| `getHistory` | `(limit?: number) => void` | `GetHistory { limit }` (default `50`) | `'game-history'` → `GameHistoryItem[]` (`{ roundId, crashAt, fairnessHash, serverSeed, startTimeMs }`). **Not** stored in the store |
| `getMyHistory` | `(limit?: number, offset?: number) => void` | `GetMyHistory { limit, offset }` (default `50`, `0`) | `'my-history'` → `MyHistoryPayload` (`rounds[] { roundId, timestamp, totalBet, totalWin, crashMultiplier, bets[] { betType, multiplier, betAmount, netCash, slot? } }`, `total`, `limit`, `offset`). Not stored in the store |

Both are also sent automatically: `GetMyHistory` on ROOM_JOIN, `GetHistory` on JoinCrashOk.

### Freerounds

| Method | Signature | Semantics | Store / events |
| `bindFreeround` | `(grantId: string) => void` | `BindFreeround { grantId }` | `BindFreeroundOk` → `'freeround-state'` (`isActive = status === 'IN_PROGRESS'`) → `freeround` |
| `unbindFreeround` | `() => void` | `UnbindFreeround` | `UnbindFreeroundOk` → `'freeround-state' null` → `freeround = null` |
| `getFreerounds` | `() => void` | `GetFreerounds` — heavy; the server returns only **AVAILABLE** grants | `GetFreeroundsOk` → `'freeround-list'` → `freeroundGrants` (overwritten) |
| `getFreeroundHistory` | `(page = 1, pageSize = 10) => void` | `GetFreeroundHistory { page, pageSize }` | `'freeround-history'` → `freeroundHistory` (the last page) |
| `acknowledgeFreeroundSummary` | `() => void` | the completed modal is closed | `lastFreeroundSummary = null`; after this a summary for the same grant can arrive again (dedupe is lifted) |

The SDK sends `GetFreerounds` **automatically** only on JoinCrashOk and on a stale-grant `Error` (`NO_BOUND_GRANT`/`GRANT_EXPIRED`); on cancel/complete — no. Details — 11-freerounds.

### Events

| Method | Signature | Semantics |
| `on` | `<K extends keyof GameEventMap>(event: K, handler: (payload: GameEventMap[K]) => void) => () => void` | subscribe; returns an unsubscribe. Handlers are called synchronously at the moment of emit, in snapshot order; a handler exception aborts the emit |
| `off` | `<K>(event: K, handler) => void` | unsubscribe with the same reference |

30 events — full table in 07-events. `'slot-state-change'` is declared in the type but is **never emitted** — use `store.subscribeToSlot`.

### Getters

| Method | Signature | Semantics |
| `getSession` | `() => LaunchSession \| null` | the result of `launch()`; refreshed on demo relaunch. Take `sessionToken` from here for `fetchRecoveryBets` |
| `getLaunchService` | `() => LaunchService` | the same instance that `launch()` uses — `parseUrlParams()`, `isDemoMode()`, `launchDemo()` |

## `KrashStore`

`core/KrashStore.ts`. Full table of fields — 08-store.

| Method | Signature | Semantics |
| `getSnapshot` | `() => GameSnapshot` | the current snapshot; the reference changes only on a real update |
| `getSlice` | `<K extends keyof GameSnapshot>(key: K) => GameSnapshot[K]` | a single field |
| `subscribe` | `(listener: () => void) => () => void` | any change + `reset()` |
| `subscribeToKey` | `(key: keyof GameSnapshot, listener: () => void) => () => void` | change of the key |
| `subscribeToSlot` | `(slot: BetSlot, listener: () => void) => () => void` | change of the `slots[slot]` object |
| `update` | `(partial: Partial<GameSnapshot>) => void` | for the engines. Change detection: `slots` → each slot by reference (`!==`), the `'slots'` key is always counted as changed if it is in the partial; other keys → `Object.is`. Without a change the listeners are not called and the snapshot reference is unchanged. On a change: new snapshot → global → key → slot listeners |
| `reset` | `() => void` | default snapshot; only global listeners. **The SDK never calls it** |

`getSnapshot`/`getSlice`/`subscribe*` are arrow properties — passing them without context is safe.

## `AutoPlayEngine`

`autoplay/AutoPlayEngine.ts`. Per-slot; via `client.getAutoPlay(slot)`. You do not call the constructor yourself.

Default config (`:15-22`): `{ isEnabled: false, rounds: 0, autoCashOut: { enabled: false, multiplier: 2.0 }, stopOnCashDecrease: { enabled: false, amount: 0 }, stopOnCashIncrease: {…}, stopOnSingleWin: {…} }`.

### Getters

| Name | Type | Semantics |
| `config` | `AutoPlayConfig` | the current config (persisted `autoPlayConfig[slot]`) |
| `isActive` | `boolean` | autoplay is running |
| `currentRound` | `number` | the number of **confirmed** bets in this session (counts up, on `bet-placed`) |
| `remainingRounds` | `number` | `max(0, totalRounds - currentRound)` |
| `totalRounds` | `number` | the argument of `start(rounds)` / `selectRounds` |
| `state` | `AutoPlayState` | `{ isActive, currentRound, totalRounds, startingBalance, config }` — a new object on every access |

### Public methods

| Method | Signature | Semantics | Persist / events |
| `updateConfig` | `(partial: Partial<AutoPlayConfig>) => void` | shallow merge | persisted |
| `selectRounds` | `(rounds: number) => void` | `totalRounds = rounds` + `config.rounds` without starting | persisted |
| `hasValidOption` | `() => boolean` | `config.rounds > 0 \|\| totalRounds > 0` | — |
| `start` | `(rounds: number) => void` | `isActive = true`, `currentRound = 0`, `totalRounds = rounds`, `startingBalance = balance`, `lastWinProfit = 0`. Does **not** place a bet and does **not** touch the store — then waits for `BETTING_OPEN` | `config.rounds` is persisted. There is no event → call `client.notifyAutoPlayChanged()`; if it is already BETTING_OPEN and you want a bet right now — `engine.onNewRound()` (the hook does this within 20 ms) |
| `stop` | `(reason = AutoPlayStopReason.MANUAL_STOP) => void` | if it was active: `isActive = false`, counters 0. Config unchanged | `'autoplay-stop' { slot, reason }` → KrashClient `forceSyncStore` |
| `reset` | `() => void` | everything 0 + config: `rounds = 0`, stop limits off, `isEnabled = false`; **`autoCashOut` stays** | persisted; the event is **not** emitted |
| `hydrate` | `() => void` | config from localStorage (KrashClient calls it on `'username'`) | — |
| `setCallbacks` | `(onBet, getBalance) => void` | KrashClient sets these — **do not override** | — |
| `checkStopConditions` | `() => AutoPlayStopReason \| null` | cash decrease/increase/single win — based on `startingBalance` and `lastWinProfit` | — |

### Lifecycle (who calls what and when)

| Method | Caller | When | What it does |
| `onNewRound()` → `boolean` | KrashClient, `'phase-change'` BETTING_OPEN | every new round | inactive → `false`. In order: `checkStopConditions` → `stop(reason)`; `currentRound >= totalRounds` → `stop(COMPLETED)`; `balance <= 0` → `stop(ERROR)`; otherwise `onBet(autoCashoutAt?)` → `client.placeBet(slot, store.slots[slot].betInputAmount, { autoCashoutAt })` (only if `betInputAmount > 0`) → `true` |
| `onBetConfirmed()` | KrashClient, `'bet-placed'` | server ACK | `currentRound += 1` — the round is counted **on confirmation**, not on send |
| `onWin(profit)` / `recordWinProfit(profit)` | KrashClient, `'cashout-done'` | cashout | `lastWinProfit = profit`. Profit: `betMode === 'BET_FROM_WIN'` → `payout` (already net), otherwise `payout - betAmount` |
| `onRoundComplete()` | KrashClient, `'phase-change'` CRASHED | end of the round | `currentRound >= totalRounds` → `stop(COMPLETED)` right away (so the button does not stay in CancelWaiting) |
| — | KrashClient, `'cashout-done'` |  | `isActive && remainingRounds <= 0` → `stop(COMPLETED)` |
| — | KrashClient, `'freeround-completed'` | the grant is exhausted | `stop(FREEROUND_COMPLETED)` on both slots — no switch to wallet money happens |

Stop conditions are checked **only on BETTING_OPEN** (`onNewRound`) — not at the moment of cashout. `ERROR` is only on `balance <= 0`; a server bet error does **not** stop autoplay (after the `isSending` timeout it tries again on the next round).

## `computeButtonVariant`

`betting/buttonVariant.ts`. Pure function; the SDK calls it on every `syncStore` and puts the result into `slots[slot].buttonVariant`/`isButtonDisabled`. You only need to call it yourself in tests/simulation.
```
function computeButtonVariant(input: ButtonVariantInput): { variant: BetButtonVariant; disabled: boolean };

interface ButtonVariantInput {
  phase: GamePhase;
  betState: BetState;        // bet?.state ?? BetState.Idle
  hasPendingBet: boolean;
  isSending: boolean;
  isCashingOut: boolean;
  isCancelling: boolean;
  isFrozen: boolean;
  isAutoPlayActive?: boolean;
}

```

Decision table (order matters; first match wins):

| # | Condition | variant | disabled |
| 1 | `isFrozen` | `betState === Active` ? `Cashout` : `Bet` | `true` |
| 2 | `isCashingOut` | `CashingOut` | `true` |
| 3 | `isSending` | `Cancel` | `true` |
| 4 | BETTING_OPEN, `Placed` | `Cancel` | `false` |
| 5 | BETTING_OPEN, `hasPendingBet` | `Cancel` | `false` |
| 6 | BETTING_OPEN, `isAutoPlayActive` | `CancelWaiting` | `false` |
| 7 | BETTING_OPEN, other | `Bet` | `false` |
| 8 | BETTING_CLOSING, `Placed`/`Active` | `Cancel` | `true` |
| 9 | BETTING_CLOSING, `hasPendingBet` | `CancelWaiting` | `true` |
| 10 | BETTING_CLOSING, other | `Bet` | `true` |
| 11 | FLYING, `Active` | `Cashout` | `false` |
| 12 | FLYING, `Placed` | `CancelWaiting` | `true` |
| 13 | FLYING, `hasPendingBet \|\| isAutoPlayActive` | `CancelWaiting` | `false` |
| 14 | FLYING, other (`Idle`/`Won`/`Lost`) | `Bet` | `false` |
| 15 | CRASHED, `Lost`/`Active`/`Placed` | `Lost` | `true` |
| 16 | CRASHED, `hasPendingBet \|\| isAutoPlayActive` | `CancelWaiting` | `false` |
| 17 | CRASHED, other (`Idle`/`Won`) | `Bet` | `false` |
| 18 | unknown phase | `Bet` | `false` |
| last | `isCancelling` | the variant from 4–18 | `true` |

Never returned: `Sending`, `Cancelling`, `Freebet`.

## `fetchRecoveryBets`

`betting/BetRecoveryService.ts`.
```
function fetchRecoveryBets(apiBaseUrl: string, sessionToken: string, roundId: string): Promise<RecoveryBet[]>;

interface RecoveryBet {
  betId: string;
  slot: number;                        // server-side 1/2
  roundId: string;
  betAmount: { amount: number; currency: string };   // RecoveryBetAmount
  status: string;
  payoutMultiplier: number | null;
  payoutAmount: number | null;
  autoCashoutMultiplier: number | null;
}

class RoundMismatchError extends Error { currentRoundId: string | undefined; }

```

`GET {apiBaseUrl}/seamless/session/recovery/bets?roundId=<encoded>`, header `X-Game-Session-Token`. Non-2xx: body `{ errorCode: 'ROUND_MISMATCH', message, currentRoundId? }` → `RoundMismatchError`; otherwise → `Error('Bet recovery request failed (status): …')`. The SDK does not call this itself.

## `LaunchService`

`launch/LaunchService.ts`. `client.getLaunchService()` — or your own: `new LaunchService({ apiBaseUrl, defaultGameId }, storage?)`.

| Method | Signature | Semantics |
| `parseUrlParams` | `(url?: string) => LaunchParams` | `t`→`oneShotToken`, `gid`→`gameId`, `lang`, `platform`, `currency`, `lobbyUrl`, `exitUrl`, `userId`; `null` when absent. Default url — `globalThis.location.href` |
| `hasDemoModeInUrl` | `(url?: string) => boolean` | `mode=demo` |
| `isDemoMode` | `(url?: string) => boolean` | `hasDemoModeInUrl \|\| !oneShotToken` |
| `exchangeToken` | `(oneShotToken: string) => Promise<SessionExchangeResponse>` | `POST /seamless/session/exchange`, body `{ one_shot_token }`. Throws: HTTP error, `result_code !== 0`, empty `session_token` |
| `launchDemo` | `(gameId?, lang?, platform?, currency?, userId?) => Promise<LaunchSession>` | `GET /seamless/launch/demo?gameId&lang?&platform&currencyCode?&userId?` → `t` from `launch_url` → `exchangeToken` → the session is stored (`krash.launch.session`), `updateBrowserUrl(launch_url)`, `addDemoModeToUrl()` |
| `launch` | `(url?: string) => Promise<LaunchSession>` | `t` is present and the stored session's `oneShotToken` matches → stored + URL merge (`restoredFromStorage: true`); `t` is new → `exchangeToken`; no `t` → `launchDemo` |
| `updateBrowserUrl` | `(launchUrl: string) => void` | the query parameters of `launchUrl` are added to the current URL via `history.replaceState` |
| `addDemoModeToUrl` | `() => void` | `mode=demo` via `replaceState` |

`LaunchSession`: `{ sessionToken, gameId, mode: string, isDemo, currency, lang, platform: string, heartbeatIntervalSeconds, restoredFromStorage?, oneShotToken? }`. `mode`/`platform` are **string** (not a union) — the server value verbatim. The session storage key — `krash.launch.session`.

## Platform helpers

`launch/platform.ts`:

| Function | Signature | Semantics |
| `normalizeRawPlatformForApi` | `(raw: string \| null \| undefined) => 'desktop' \| 'mobile' \| undefined` | `mobile/mob/m/0` → `'mobile'`; `desktop/desk/d/1` → `'desktop'`; other → `undefined` |
| `detectPlatform` | `() => 'desktop' \| 'mobile'` | no `window` → `'desktop'`. `'mobile'` if **any one** of: mobile UA (`Android\|webOS\|iPhone\|iPad\|iPod\|BlackBerry\|IEMobile\|Opera Mini`), `(pointer: coarse)`, `0 < innerWidth < 700` |
| `resolvePlatformForApi` | `(raw) => 'desktop' \| 'mobile'` | `normalizeRawPlatformForApi(raw) ?? detectPlatform()` |

The URL's `?platform` is only a hint — an invalid value is replaced by runtime detection. (The comment at `platform.ts:31` says `1024` — it is outdated, the code uses `700`.)

## Logger and debug

`utils/logger.ts`:

| Name | Signature | Semantics |
| `setDebugEnabled` | `(enabled: boolean) => void` | global toggle |
| `isDebugEnabled` | `() => boolean` |  |
| `autoDetectDebug` | `(opts?: { url?: string; storage?: { getItem(k: string): string \| null } \| null }) => boolean` | `?debug=1\|true` or `localStorage['krash:debug'] === '1'\|'true'`; any error → `false` |
| `logger.debug` | getter → `console.log` bound or noop | preserves the caller's file:line |
| `logger.error` | getter → `console.error` bound or noop | depends on debug — silent in production |

`SDK_VERSION` — `version.ts`, always equal to `package.json`'s `version` (generated by `gen-version.mjs` on every build); written as a banner on `launch()` regardless of debug.

## Other exported classes

| Export | Useful for | Note |
| `EventEmitter<EventMap>` | your own typed pub/sub | `on` (returns an unsubscribe), `off`, `emit`, `removeAllForEvent`, `removeAll`. The `KrashClient` emitter is private |
| `PersistentState`, `MemoryStorageAdapter`, `PersistedGameState` | tests, your own persistence | the `KrashClient` instance is private |
| `GameEngine` | **only** `GameEngine.latestMultiplier` (static) | the instance is private; the getters (`phase`, `roundId`, `multiplier`, `remainingMs`, `isFrozen`) are inaccessible — use the store |
| `FreezeDetector` | your own heartbeat | `new FreezeDetector(ms, cb)`, `onTick()`, `stop()`, `isFrozen` |
| `BettingEngine` | types/tests | the instance is private; your own instance will not work with `KrashClient` |
| `ConnectionManager`, `ConnectionConfig` | types | the instance is private; separate construction is unsupported |
| `SfsProtocol` (namespace) | wire helpers: `toSlot`, `toServerSlot`, `build*Object`, `parse*` | if you add your own SFS extension |

## `packages/sdk/src/index.ts` — full export list

```
export * from './types';
//  enums:   GamePhase, BetState, BetSlot, BetLayout, BetButtonVariant, AutoPlayStopReason,
//           AutoPlayRoundOption, LaunchStatus, Platform; type ConnectionState
//  events:  CurrencyMode, TickPayload, CrashStatePayload, PingPongPayload, BetPlacedPayload,
//           CashoutDonePayload, CancelBetOkPayload, BetUpdatePayload, BetUpdateBroadcastPayload,
//           RoundMyBetsPayload, FreeroundStatus, FreeroundGrant, FreeroundState, FreeroundHistoryEntry,
//           FreeroundHistoryPayload, FreeroundSummaryPayload, GameHistoryItem, MyHistoryPayload, GameEventMap
//  betting: PlayerBet, SlotSnapshot, PendingBet, ClientConfigButton, ClientConfig, GameConfig,
//           AutoPlayConfig, AutoPlayState
//  launch:  LaunchParams, SessionExchangeResponse, DemoLaunchResponse, LaunchConfig, LaunchSession, LaunchState
//  game:    GameSnapshot, KrashConfig, StorageAdapter

export { KrashClient } from './core/KrashClient';
export { EventEmitter } from './core/EventEmitter';
export { KrashStore } from './core/KrashStore';

export { PersistentState, MemoryStorageAdapter } from './persistence/PersistentState';
export type { PersistedGameState } from './persistence/PersistentState';

export { LaunchService } from './launch/LaunchService';
export { normalizeRawPlatformForApi, detectPlatform, resolvePlatformForApi } from './launch/platform';

export { GameEngine } from './game/GameEngine';
export { FreezeDetector } from './game/FreezeDetector';

export { AutoPlayEngine } from './autoplay/AutoPlayEngine';

export { BettingEngine } from './betting/BettingEngine';
export { computeButtonVariant } from './betting/buttonVariant';
export type { ButtonVariantInput } from './betting/buttonVariant';
export { fetchRecoveryBets, RoundMismatchError } from './betting/BetRecoveryService';
export type { RecoveryBet, RecoveryBetAmount } from './betting/BetRecoveryService';

export { ConnectionManager } from './connection/ConnectionManager';
export type { ConnectionConfig } from './connection/ConnectionManager';
export * as SfsProtocol from './connection/SfsProtocol';

export { logger, setDebugEnabled, isDebugEnabled, autoDetectDebug } from './utils/logger';
export { SDK_VERSION } from './version';

```

## Vanilla JS / non-React usage

A full, compilable example: launch, rendering the button from the store, auto-play, free bet summary, session expiry, cleanup. The HTML has the `#balance`, `#phase`, `#amount`, `#bet`, `#auto` elements.
```
import * as SFS2X from 'sfs2x-api';
import {
  KrashClient, BetSlot, BetButtonVariant, GamePhase, AutoPlayStopReason,
} from '@krash/sdk';
import type { SlotSnapshot } from '@krash/sdk';

function el<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

const balanceEl = el<HTMLElement>('#balance');
const phaseEl = el<HTMLElement>('#phase');
const amountEl = el<HTMLInputElement>('#amount');
const betBtn = el<HTMLButtonElement>('#bet');
const autoBtn = el<HTMLButtonElement>('#auto');

const client = new KrashClient({
  apiBaseUrl: 'https://api.example.com',
  sfsHost: 'ws.example.com',
  gameId: 'your_game',
});

const SLOT = BetSlot.Slot1;
const auto = client.getAutoPlay(SLOT);

// ── Store → DOM ──────────────────────────────────────────────
client.store.subscribeToKey('balance', () => {
  balanceEl.textContent = client.store.getSlice('balance').toFixed(2);
});

client.store.subscribeToKey('phase', renderPhase);
client.store.subscribeToKey('multiplier', renderPhase);
function renderPhase(): void {
  const phase = client.store.getSlice('phase');
  const m = client.store.getSlice('multiplier');
  phaseEl.textContent = phase === GamePhase.FLYING ? `${m.toFixed(2)}x` : phase;
}

client.store.subscribeToSlot(SLOT, () => renderSlot(client.store.getSlice('slots')[SLOT]));
function renderSlot(s: SlotSnapshot): void {
  betBtn.disabled = s.isButtonDisabled;
  betBtn.textContent = s.buttonVariant + (s.hasPendingBet ? ' (queued)' : '');
  if (document.activeElement !== amountEl) amountEl.value = String(s.betInputAmount);
  autoBtn.textContent = auto.isActive ? `Stop auto (${auto.remainingRounds} left)` : 'Auto ×20';
}

// ── DOM → client ─────────────────────────────────────────────
amountEl.addEventListener('change', () => {
  const cfg = client.store.getSlice('gameConfig');
  let v = Number(amountEl.value) || 0;
  if (cfg) v = Math.min(cfg.maxBet, Math.max(cfg.minBet, v));   // the SDK does not clamp
  client.setBetInputAmount(SLOT, v);
});

betBtn.addEventListener('click', () => {
  const s = client.store.getSlice('slots')[SLOT];
  switch (s.buttonVariant) {
    case BetButtonVariant.Bet: {
      if (s.betInputAmount > client.store.getSlice('balance')) return; // insufficient balance — the UI's job
      const ac = auto.config.autoCashOut;
      client.placeBet(SLOT, s.betInputAmount, { autoCashoutAt: ac.enabled ? ac.multiplier : undefined });
      break;
    }
    case BetButtonVariant.Cashout:
      client.cashout(SLOT);
      break;
    case BetButtonVariant.Cancel:
    case BetButtonVariant.CancelWaiting:
      client.cancelBet(SLOT);
      if (auto.isActive) auto.stop(AutoPlayStopReason.MANUAL_STOP);
      break;
    default:
      break;
  }
});

autoBtn.addEventListener('click', () => {
  if (auto.isActive) {
    auto.stop();                                 // 'autoplay-stop' → KrashClient syncs by itself
    return;
  }
  auto.start(20);
  client.notifyAutoPlayChanged();                // start() does not touch the store
  if (client.store.getSlice('phase') === GamePhase.BETTING_OPEN) {
    auto.onNewRound();                           // place right now, do not wait for the next round
  }
});

// ── Events ───────────────────────────────────────────────────
const offs = [
  client.on('autoplay-stop', ({ reason }) => console.log('autoplay stopped:', reason)),
  client.on('cashout-done', ({ payout, multiplier }) => console.log(`won ${payout} @ ${multiplier}x`)),
  client.on('bet-error', ({ slotIndex, error }) => console.warn('bet rejected', slotIndex, error)),
  client.on('missed-round-bets', ({ bets }) => console.warn('unresolved bets from previous round', bets)),
  client.on('freeround-summary', (s) => console.log('free bet finished:', s.reason ?? 'COMPLETED', s.totalWin)),
  client.on('connection-change', ({ state }) => document.body.dataset.connection = state),
  client.on('session-expired', () => {
    const session = client.getSession();
    if (session?.isDemo) location.reload();
    else location.href = client.getLaunchService().parseUrlParams().lobbyUrl ?? '/';
  }),
];

window.addEventListener('beforeunload', () => {
  offs.forEach((off) => off());
  client.destroy();
});

// ── Launch ───────────────────────────────────────────────────
try {
  const session = await client.launch(SFS2X);
  console.log('launched', session.gameId, session.isDemo ? 'demo' : 'real');
} catch (err) {
  phaseEl.textContent = err instanceof Error ? err.message : String(err);
}

```

What to watch out for in vanilla: - Subscribe before `launch()` — otherwise you miss the first `balance` from `JoinCrashOk`. - `launch()` resolving ≠ the game is ready; "ready" = `connectionState === 'connected'` (after JoinCrashOk) and `gameConfig !== null`. - `client.notifyAutoPlayChanged()` after `auto.start()` — otherwise the button stays `Bet` until some sync happens. - The `useAutoPlay` hook's "currentRound" = `engine.remainingRounds`; in vanilla `engine.currentRound` counts up. - `client.destroy()` once; after that you need a new `KrashClient`.

