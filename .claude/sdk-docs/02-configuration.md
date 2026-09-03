<!-- source: https://krash-sdk-docs.playcore.live/en/02-configuration/ -->

# 2. Configuration

In this chapter: `KrashConfig` (what `KrashClient`/`KrashProvider` accepts), debug logging, storage adapter, every localStorage key, what is saved and what is not, and `GameConfig` — the config coming from the server. All defaults are from `KrashClient.ts:50-82`.

## `KrashConfig`

Type — `packages/sdk/src/types/game.ts:62-95`. `KrashProviderProps extends KrashConfig`, so this table also describes the provider's props.

| Field | Type | Default | Where it is used |
| `apiBaseUrl` | `string` | **required** | `LaunchService` — `POST /seamless/session/exchange`, `GET /seamless/launch/demo`. Pass this to `fetchRecoveryBets` as well |
| `sfsHost` | `string` | **required** | `new SmartFox({ host })` |
| `sfsPort` | `number` | `443` | `SmartFox({ port })` |
| `useSSL` | `boolean` | `true` | `SmartFox({ useSSL })` — `wss://` |
| `sfsZone` | `string` | `'BasicExamples'` | `SmartFox({ zone })` and `LoginRequest(..., zone)` |
| `gameId` | `string` | `'kings_move'` (legacy default — always pass your own `gameId`) | `LaunchConfig.defaultGameId` — fallback if there is no `gid` in the URL; part of the persistence key |
| `storage` | `StorageAdapter` | `localStorage` (if it does not exist — `MemoryStorageAdapter` in `PersistentState`, a no-op object in `LaunchService`) | `PersistentState` and `LaunchService` — both receive the same adapter |
| `reconnect.maxAttempts` | `number` | `100` | Limit on attempts after `CONNECTION_LOST` |
| `reconnect.baseDelay` | `number` | `1000` ms | start of the exponential backoff: `baseDelay * 2^(attempt-1)` |
| `reconnect.maxDelay` | `number` | `30000` ms | backoff ceiling |
| `keepAliveInterval` | `number` | `5000` ms | `GetBalance` every N ms after LOGIN — this is why the `balance` event arrives "for no reason" about once every 5 seconds |
| `loginTimeout` | `number` | `10000` ms | wait from CONNECTION to LOGIN; exceeding it in demo → demo relaunch, in real → `session-expired` |
| `debug` | `boolean` | `false` | `setDebugEnabled(config.debug ?? autoDetectDebug())` — an explicit value overrides URL/localStorage |

`KrashClient` keeps the same object you passed as the readonly `clientConfig` field.

Reconnect details (`ConnectionManager.ts:624-644`): reconnect happens only on `CONNECTION_LOST`, not while waiting for login; on every attempt `connection-change {state:'disconnected'}` is emitted; when `maxAttempts` is exhausted the SDK stops and emits `disconnected` one last time — after that the UI should offer a Reload. `KrashClient` **has no `disconnect()`**; only `destroy()`, after which the instance is no longer usable (`launch()` throws `KrashClient is destroyed`).

## Debug logging

By default the SDK is silent in the console. The only permanent line is the version banner on `launch()`:
```
[Krash SDK] v0.1.0

```

(`SDK_VERSION` lives in `packages/sdk/src/version.ts` and is generated from `package.json`'s `version` on every build — it always matches the published version.)

Three ways to enable it (`utils/logger.ts`):

| Way | How | When |
| `KrashConfig.debug: true` | provider prop / config field | dev build |
| URL `?debug=1` (or `?debug=true`) | in the launch URL | for support, without code |
| `localStorage.setItem('krash:debug', '1')` | DevTools console → reload | diagnosing a live session |

Programmatic API (all exported from `@krash/sdk`):
```
import { setDebugEnabled, isDebugEnabled, autoDetectDebug, logger } from '@krash/sdk';

setDebugEnabled(true);                 // runtime toggle, without a reload
isDebugEnabled();                      // boolean
autoDetectDebug({ url, storage });     // the same rule the constructor uses
logger.debug('[skin] ...');            // console.log if debug is enabled; otherwise noop
logger.error('[skin] ...');            // console.error, under the same condition

```

`logger.debug`/`logger.error` are getters and return `console.log.bind(console)` — DevTools shows the caller's file:line, not `logger.ts`. `logger.error` also depends on debug — in production SDK errors are **not** visible in the console; use `client.on('error', ...)`.

## Storage adapter

```
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

```

`MemoryStorageAdapter` (an in-memory `Map`) is exported for tests and SSR. Example of your own adapter — 09-advanced. Every adapter call is inside try/catch — quota/privacy-mode errors are silently swallowed.

## localStorage keys

| Key | Who writes | What it holds | When it is deleted |
| `krash.game_state:<username>:<gameId>` | `PersistentState` (SDK) | `PersistedGameState` JSON — see below | never automatically; keys of other users/games remain untouched |
| `krash.game_state` (legacy, without namespace) | old SDK | — | deleted on the first `setUserKey()` (`PersistentState.ts:156-158`) |
| `krash.launch.session` | `LaunchService` | `LaunchSession` JSON (`sessionToken`, `gameId`, `mode`, `currency`, `lang`, `platform`, `heartbeatIntervalSeconds`, `oneShotToken`) | overwritten on every new exchange/demo launch |
| `krash:debug` | you (DevTools) | `'1'` / `'true'` | manually |
| `krash.settings:<sessionToken>` | `SettingsProvider` (`@krash/react`) | `{ sound, music, animation }` | the legacy `krash.settings` is deleted on the first bind; it is namespaced by token, i.e. every new launch creates a new key |

`<username>` is `sfs.mySelf.name` after SFS login (the `'username'` event), `<gameId>` — `session.gameId`. The key is bound in `KrashClient`'s `'username'` listener (`KrashClient.ts:203-213`), **after launch, on login** — before that `PersistentState.load()` returns `{}` and `save()` is a no-op. On reconnect `username` is emitted again, but there is no re-hydrate for the same key.

## What is saved and what is restored

`PersistedGameState` (`PersistentState.ts:17-25`):

| Field | Writes | Reads (hydrate) | Result |
| `betInputAmounts` `{0: n, 1: n}` | `BettingEngine.setBetInputAmount` | `BettingEngine.hydrate()` | saved and restored |
| `betLayout` | `BettingEngine.setBetLayout` | `BettingEngine.hydrate()` | saved and restored (only the `'single'`/`'double'` values) |
| `autoPlayConfig` `{slot: AutoPlayConfig}` | `AutoPlayEngine.updateConfig/selectRounds/start/reset` | `AutoPlayEngine.hydrate()` | saved and restored — including `autoCashOut {enabled, multiplier}` and the stop limits |
| `autoCashout` | **nobody** — `saveAutoCashout()` is never called | — | an empty field. Auto-cashout actually lives in `autoPlayConfig[slot].autoCashOut` |
| `pendingBets` | `BettingEngine` (`placeBet`/`cancelBet`/`drainPendingBets`) | **nobody** | write-only. After a refresh a pending bet is **not restored** |
| `activeBets`, `lastRoundId` | `BettingEngine` (`bet-placed`/`cashout-done`/`cancel-bet-ok`) | **nobody** | write-only. Active bets are restored from the server on reconnect (`RoundMyBets`), not from localStorage |

**Not saved at all:** freeround state (comes from the server on `JoinCrashOk`), `gameConfig`, `balance`, history.

Hydrate happens once, on the `'username'` event. The default `betInputAmount` is `5` (`KrashStore.ts:25`, `BettingEngine.ts:30`); if `clientConfig.defaultBet` arrives, putting it into the input is **your** job (reference implementation: via `client.setBetInputAmount`, once per `configUpdatedAt`).

## `GameConfig` — from the server

`GetGameConfig` is sent on LOGIN; the response is the `GameConfig` extension response → the `'game-config'` event + `store.gameConfig`. Parser — `SfsProtocol.ts:479-506`. Wire field names are camelCase and match the SDK fields.

| Field | Type | Wire | Note |
| `minBet` | `number` | `minBet` | the SDK does **not** check it — UI clamp |
| `maxBet` | `number` | `maxBet` | same |
| `maxWinAmount` | `number` | `maxWinAmount` | for display |
| `maxBetsPerUser` | `number` | `maxBetsPerUser` | for display; the SDK does not allow more than two slots anyway |
| `currencyCode` | `string` | `currencyCode` | empty → `'USD'`. On arrival, `BettingEngine.setCurrency` — `PlaceBet.currency` is sent with this value |
| `hasMoreOptions` | `boolean` | `hasMoreOptions` | operator flag |
| `currencyMinorUnits` | `number` | `currencyMinorUnits` | `0` → `2`. For formatting |
| `clientConfig?` | `ClientConfig` | `clientConfig` (SFSObject) | only if configured for operator+game+currency |
| `configUpdatedAt?` | `number` | `configUpdatedAt` (long, epoch ms) | only together with `clientConfig`. Revision id — use it to tell whether you have already applied this config |

### `ClientConfig`

`types/betting.ts:59-88`:
```
interface ClientConfigButton {
  key: string;    // stable id (selection state, analytics)
  title: string;  // label — visual only, never parse it as a number
  value: number;  // all calculations from here
}

interface ClientConfig {
  version: number;             // schema version (currently 1)
  defaultBet: number;          // initial value of the bet input
  defaultAutoCashout: number;  // initial value of the auto-cashout input
  betStep?: number;            // step of the +/- buttons; when absent use 1
  multiplyButton: ClientConfigButton;   // a single stake-multiply button (e.g. x2)
  speedButtons: ClientConfigButton[];   // quick-bet presets — the server sends exactly 3, in array order
}

```

The SDK **only stores** `clientConfig` in `store.gameConfig` — it neither fills the input nor draws buttons. Reference implementation policy: on every new value of `configUpdatedAt`, once, `defaultBet` is written into both slots' inputs and `defaultAutoCashout` into both slots' `autoCashOut.multiplier` (the toggle stays off). If `clientConfig` did not arrive — the skin's own hardcoded defaults remain.

`GameConfigProvider` (`@krash/react`) is a separate context and is **inert** until the app calls `updateConfig(sdkGameConfig)`. The `useGameConfig()` hook reads the store directly and does not need this synchronization.

## `currencyMode`

The top-level `currencyMode` field of `JoinCrashOk` (`'single' | 'multi'`) — how to render **other players'** bet feed: `single` — one currency, a compact column; `multi` — each row has its own `currency`. Unknown value → `'single'`. `'currency-mode'` event → `store.currencyMode`; hooks `useCurrencyMode()`, `useIsMultiCurrency()`. This does not concern the player's own currency — that is `gameConfig.currencyCode`/`session.currency`. Do not "guess" the mode from the feed's currencies — the server's field is authoritative.

## Environment variables (Vite)

```
const config: KrashConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://api.example.com',
  sfsHost:    import.meta.env.VITE_SFS_HOST     ?? 'ws.example.com',
  gameId:     import.meta.env.VITE_GAME_ID      ?? 'your_game',
};

```

The reference implementation reads it exactly like this, with a `||` fallback. `.env`/`vite-env.d.ts` setup — 01-getting-started.

## Vanilla JS

```
import * as SFS2X from 'sfs2x-api';
import { KrashClient } from '@krash/sdk';

const client = new KrashClient({
  apiBaseUrl: 'https://api.example.com',
  sfsHost: 'ws.example.com',
  gameId: 'your_game',
  debug: location.hostname === 'localhost',
});

const session = await client.launch(SFS2X);

```

You don't have the React contexts (Currency, Settings, Language, Device, GameConfig) in vanilla — they are the `@krash/react` layer. Full vanilla reference — 16-krashclient-api.

