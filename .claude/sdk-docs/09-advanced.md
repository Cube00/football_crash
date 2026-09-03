<!-- source: https://krash-sdk-docs.playcore.live/en/09-advanced/ -->

# 9. Advanced Topics

The exact behavior of persistence, the store's state during a reconnect, demo relaunch, custom storage, testing with a `KrashContext` mock, the SDK's structure and the full export list. Every line has been verified against the code in `packages/sdk/src`.

## Persistence

The SDK writes one key to localStorage (or your `StorageAdapter`):
```
krash.game_state:<username>:<gameId>

```

`<username>` — `sfs.mySelf.name` after SFS login (the `'username'` event), `<gameId>` — `session.gameId`. The key is bound in `KrashClient`'s `'username'` listener (`KrashClient.ts:203-213`) — **not inside launch()**. After binding, `BettingEngine.hydrate()` and both `AutoPlayEngine.hydrate()` run once; on reconnect `username` arrives again, but the key is the same → hydrate is not repeated. The legacy `krash.game_state` (without namespace) is deleted on the first binding, the `krash.game_state:*` keys of other users/games remain.

What is saved and what is restored:

| Field | Saved | Restored on refresh |
| `betInputAmounts` (per slot) | yes | **yes** |
| `betLayout` | yes | **yes** |
| `autoPlayConfig` (per slot: `rounds`, `autoCashOut {enabled, multiplier}`, stop limits, `isEnabled`) | yes | **yes** |
| `autoCashout` (separate field) | **no** — `saveAutoCashout()` is never called | — (auto-cashout lives in `autoPlayConfig.autoCashOut`) |
| `pendingBets` | yes | **no** — write-only |
| `activeBets`, `lastRoundId` | yes | **no** — write-only; active bets are restored from the server |

Freeround state, `gameConfig`, `balance`, history — never saved, they come from the server on every login. Full table and keys — 02-configuration.

## Reconnect and store state

`ConnectionManager` starts a reconnect **only** on `CONNECTION_LOST` (after login has completed); exponential backoff `1000 · 2^(n-1)` ms, ceiling `30000`, at most `100` attempts (`ConnectionManager.ts:624-644`). A connection lost while waiting for login does not cause a reconnect — in demo, one relaunch; otherwise `session-expired`.

What happens in the store (`store.reset()` is never called):

| Moment | `connectionState` | Other fields |
| CONNECTION_LOST | `'disconnected'` | everything **unchanged**: `slots[].bet`, `balance`, `phase`, `freeround`. In ~2000 ms `isGameFrozen = true` (no ticks arrive). Timeouts (`isSending` 5000, cashout/cancel 3000) expire as usual |
| every reconnect attempt | `'disconnected'` | — |
| socket CONNECTION | `'connected'` | the `server-connected` event; the buttons are still frozen |
| LOGIN | `'checking'` | `JoinCrash` + `GetGameConfig` are sent; `username` (key unchanged → no hydrate) |
| ROOM_JOIN | — | `GetRoundBets`, `GetRoundMyBets`, `GetMyHistory` → `round-my-bets` **overwrites** the slots that the server has; a local bet not in the list **remains** |
| JoinCrashOk | `'connected'` | `currency-mode`, `balance`, `freeround-state` (grant or `null` — replaces the local one), then `game-history`, `freeround-list` |
| GameConfig | — | `gameConfig` is overwritten |
| first tick | — | `isGameFrozen = false`, `phase`/`multiplier`/`roundId` from the server |

Important consequences: - After a reconnect, until `BETTING_OPEN`, a slot may show a bet from an **old round** if `RoundMyBets` did not overwrite it. On `BETTING_OPEN` it is emitted as `missed-round-bets` and cleared (04). - Autoplay **does not stop** on reconnect — `AutoPlayEngine.isActive` remains and on the next `BETTING_OPEN` it places a bet again (if `balance > 0`). If you don't want this, call `engine.stop()` yourself on `connection-change {state:'disconnected'}`. - A pending bet survives a reconnect (it is in memory) and is sent on `BETTING_OPEN`. - `keepAlive` (`GetBalance` 5000 ms) restarts on every LOGIN.

Overlay in React: `useConnectionStatus().state !== 'connected'` **or** `useIsGameFrozen()`. Do not wire the overlay's Reload button to `relaunchDemo()` in a real-money session — it moves the player to demo; use `window.location.reload()` (01).

## Demo relaunch

A demo session's lifetime is short. `KrashClient.launch()` (`KrashClient.ts:246-267`) sets, via `ConnectionManager.setOnDemoRelaunch(cb)`, a callback that:

1. `launchService.parseUrlParams()` → `launchService.launchDemo(gameId, lang, platform, currency, userId)` — a new demo session (`GET /seamless/launch/demo` → exchange → `krash.launch.session` overwritten).
1. `connectionManager.connect(newSession.sessionToken, sfs2xModule)` — a new socket.
1. On failure → `session-expired`.

`ConnectionManager` calls this callback when `isDemo === true` and **one of**: login timeout (`loginTimeout`), `LOGIN_ERROR`, `CONNECTION_LOST` while waiting for login. **One** attempt per `connect()` (`demoRelaunchAttempted`); a second failure → `session-expired`. On a real session this path never runs.

On the provider side `session-expired` → `launchStatus = 'error'`, `launchError = 'Session rejected by server'`, `session = null`; `onLaunchError` is **not** called. Manually from the UI — `useKrashState().relaunchDemo()`:
```
import { useKrashState } from '@krash/react';

function ExpiredScreen() {
  const { isDemo, launchStatus, launchError, relaunchDemo, lobbyUrl } = useKrashState();
  if (launchStatus !== 'error') return null;
  return (
    <div>
      <p>{launchError}</p>
      {isDemo
        ? <button onClick={() => void relaunchDemo()}>Restart demo</button>
        : <a href={lobbyUrl ?? '/'}>Back to lobby</a>}
    </div>
  );
}

```

`relaunchDemo()` sets `ready` before the reconnect completes — check `connectionState` in the loader too (01 — loader gate).

## Custom `StorageAdapter`

```
import type { StorageAdapter } from '@krash/sdk';

class PrefixedSessionStorage implements StorageAdapter {
  constructor(private prefix = 'game:') {}
  getItem(key: string): string | null {
    return sessionStorage.getItem(this.prefix + key);
  }
  setItem(key: string, value: string): void {
    sessionStorage.setItem(this.prefix + key, value);
  }
  removeItem(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }
}

<KrashProvider apiBaseUrl="…" sfsHost="…" sfs2xModule={SFS2X} storage={new PrefixedSessionStorage()}>
  …
</KrashProvider>

```

The same adapter is passed to both `PersistentState` and `LaunchService` (`krash.launch.session`). `SettingsProvider` (`@krash/react`) does **not** use the adapter — it writes directly to `globalThis.localStorage`. Adapter errors are silently swallowed; it is a sync API — you cannot plug in async storage (IndexedDB) directly, you will need a cache layer. `MemoryStorageAdapter` is exported from the SDK for tests.

## Testing with a `KrashContext` mock

`KrashContext` is exported from `@krash/react` (with a `KrashProviderState` value). In a test, instead of `KrashProvider`, you feed the context directly with a real `KrashClient` on which `launch()` has not been called — the engines and the store work, there is no socket. You fill the store with `client.store.update()` (this is allowed in a test):
```
// BetButton.test.tsx — Vitest + @testing-library/react
import { render, screen } from '@testing-library/react';
import { KrashContext, KrashClient, MemoryStorageAdapter, BetSlot, BetState, GamePhase, BetButtonVariant } from '@krash/react';
import type { KrashProviderState } from '@krash/react';
import { BetButton } from './BetButton';

function makeClient(): KrashClient {
  return new KrashClient({
    apiBaseUrl: 'http://test',
    sfsHost: 'test',
    storage: new MemoryStorageAdapter(),
  });
}

function renderWithClient(client: KrashClient, ui: React.ReactElement) {
  const value: KrashProviderState = {
    client,
    launchStatus: 'ready',
    session: null,
    launchError: null,
    isDemo: true,
    lobbyUrl: null,
    exitUrl: null,
    relaunchDemo: async () => {},
  };
  return render(<KrashContext.Provider value={value}>{ui}</KrashContext.Provider>);
}

test('shows Cashout when slot bet is active in FLYING', () => {
  const client = makeClient();
  const slots = client.store.getSlice('slots');
  client.store.update({
    phase: GamePhase.FLYING,
    slots: {
      ...slots,
      [BetSlot.Slot1]: {
        ...slots[BetSlot.Slot1],
        bet: { id: 'b1', amount: 10, state: BetState.Active },
        buttonVariant: BetButtonVariant.Cashout,
        isButtonDisabled: false,
      },
    },
  });

  renderWithClient(client, <BetButton slot={BetSlot.Slot1} />);
  expect(screen.getByRole('button')).toHaveTextContent(/cashout/i);
  client.destroy();
});

```

Notes: - `bet.state` is the `BetState` enum — the string literal `'active'` **cannot** be assigned to it (string enums are nominal). - `toHaveTextContent` is from `@testing-library/jest-dom` — load it in your test setup file (`import '@testing-library/jest-dom'`). - If you want to go through `BettingEngine`'s logic in a test (rather than filling the store manually), call `client.placeBet()`, and you cannot emit `'phase-change'` — the emitter is private. In such tests you test `computeButtonVariant` as a pure function, and the engine flow — with the SDK's own tests (`packages/sdk/src/**/__tests__`). - In e2e you can substitute `sfs2x-api` with a mock through a `vite.config.ts` alias (e.g. `VITE_E2E=true` → alias to your own mock module). - `client.destroy()` at the end of every test — otherwise timeouts (`betFailed` 3000, slot timeouts) linger.

## SDK structure

```
packages/sdk/src
├── core/         KrashClient (facade), KrashStore, EventEmitter
├── connection/   ConnectionManager (SFS2X lifecycle), SfsProtocol (SFSObject ↔ payload)
├── launch/       LaunchService (exchange, demo, session storage), platform
├── game/         GameEngine (phase/tick/round), FreezeDetector
├── betting/      BettingEngine (per-slot state machine), buttonVariant, BetRecoveryService
├── autoplay/     AutoPlayEngine (per-slot)
├── persistence/  PersistentState, MemoryStorageAdapter
├── utils/        logger
├── types/        enums, events, betting, launch, game
├── version.ts    SDK_VERSION
└── index.ts

```

Inside `KrashClient`, `ConnectionManager`, `GameEngine`, `BettingEngine`, `PersistentState`, `EventEmitter` are **private** — you have no access to them, even though the classes are exported. Public — `store`, `clientConfig`, `getAutoPlay(slot)`, `getLaunchService()`, `getSession()`.

## `@krash/sdk` — full export list

`packages/sdk/src/index.ts`:
```
// Types & enums — everything from ./types
export * from './types';
//   enums:   GamePhase, BetState, BetSlot, BetLayout, BetButtonVariant, AutoPlayStopReason,
//            AutoPlayRoundOption, LaunchStatus, Platform, type ConnectionState
//   events:  type CurrencyMode, TickPayload, CrashStatePayload, PingPongPayload, BetPlacedPayload,
//            CashoutDonePayload, CancelBetOkPayload, BetUpdatePayload, BetUpdateBroadcastPayload,
//            RoundMyBetsPayload, FreeroundStatus, FreeroundGrant, FreeroundState, FreeroundHistoryEntry,
//            FreeroundHistoryPayload, FreeroundSummaryPayload, GameHistoryItem, MyHistoryPayload, GameEventMap
//   betting: type PlayerBet, SlotSnapshot, PendingBet, ClientConfigButton, ClientConfig, GameConfig,
//            AutoPlayConfig, AutoPlayState
//   launch:  type LaunchParams, SessionExchangeResponse, DemoLaunchResponse, LaunchConfig, LaunchSession, LaunchState
//   game:    type GameSnapshot, KrashConfig, StorageAdapter

// Core
export { KrashClient, EventEmitter, KrashStore };

// Persistence
export { PersistentState, MemoryStorageAdapter };
export type { PersistedGameState };

// Launch
export { LaunchService, normalizeRawPlatformForApi, detectPlatform, resolvePlatformForApi };

// Game
export { GameEngine, FreezeDetector };

// AutoPlay
export { AutoPlayEngine };

// Betting
export { BettingEngine, computeButtonVariant, fetchRecoveryBets, RoundMismatchError };
export type { ButtonVariantInput, RecoveryBet, RecoveryBetAmount };

// Connection
export { ConnectionManager };
export type { ConnectionConfig };
export * as SfsProtocol from './connection/SfsProtocol';

// Utils
export { logger, setDebugEnabled, isDebugEnabled, autoDetectDebug, SDK_VERSION };

```

`@krash/react` (`packages/react/src/index.ts`) re-exports all of this (`export * from '@krash/sdk'`) and adds: `KrashProvider`, `KrashContext`, types `KrashProviderProps`, `KrashProviderState`, `KrashLaunchStatus`; contexts `DeviceProvider/useDevice`, `SettingsProvider/useSettings` (`GameSettings`), `CurrencyProvider/useCurrency`, `GameConfigProvider/useGameConfigContext`, `LanguageProvider/useLanguage/Language` (`TFunction`); hooks `useKrashClient`, `useKrashState`, `useKrashGame`, `useBalance`, `usePhase`, `useMultiplier`, `useCrashedAt`, `useGameConfig`, `useCurrencyMode`, `useIsMultiCurrency`, `useBetLayout`, `useIsGameFrozen`, `useConnectionStatus`, `useBetting`, `useAutoPlay`, `useGameHistory`, `useMyBets`, `useMediaQuery`, `useClickOutside`, `useBettingSlot` (`BettingSlotReturn`, `AutoCashoutState`), `useWinDisplay`, `useHasActiveBets`, `useFreerounds` (`UseFreeroundsReturn`).

The signature and semantics of every vanilla API — 16-krashclient-api.

