<!-- source: https://krash-sdk-docs.playcore.live/en/01-getting-started/ -->

# 1. Getting Started

This chapter describes how to set up a new **React + Vite + TypeScript** project on top of `@krash/sdk` + `@krash/react` and what actually happens from the mount of `KrashProvider` to the first `BetPlaced`. Every step has been verified against the current code in `packages/sdk/src` and `packages/react/src`; the reference implementation whose patterns you can take over is described in 14-reference-implementation.

## Packages and peer dependencies

| Package | What it contains | Peer deps |
| `@krash/sdk` | framework-agnostic core: `KrashClient`, `KrashStore`, engines, `LaunchService` | `sfs2x-api` |
| `@krash/react` | `KrashProvider`, hooks, contexts; `export * from '@krash/sdk'` | `react ^18 \|\| ^19`, `@krash/sdk` |

`sfs2x-api` **is a peer dependency and the SDK does not import it itself** — you pass the module via the `sfs2xModule` prop (`KrashProvider`) or as the first argument of `client.launch(SFS2X)`. This lets the bundle contain your version and lets you substitute a mock in tests (the reference implementation does this with an alias in `vite.config.ts` when `VITE_E2E=true`).

`@krash/react` re-exports everything from `@krash/sdk`, so `import { BetSlot, GamePhase } from '@krash/react'` is correct and you can take everything from a single import.

## Setting up the Vite project

```
pnpm create vite my-crash-skin --template react-ts
cd my-crash-skin
pnpm add @krash/sdk @krash/react sfs2x-api
pnpm install

```

### `.env`

Vite only passes `VITE_`-prefixed variables to the client:
```
VITE_API_BASE_URL=https://your-api.example.com
VITE_SFS_HOST=ws.your-api.example.com
VITE_GAME_ID=your_game

```

### `src/vite-env.d.ts`

Typing for `import.meta.env`, so that in `strict` mode `string | undefined` shows up correctly:
```
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** REST API base URL (session exchange, demo launch). */
  readonly VITE_API_BASE_URL?: string;
  /** SmartFox host. */
  readonly VITE_SFS_HOST?: string;
  /** Default game id, if there is no `gid` in the URL. */
  readonly VITE_GAME_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

```

### `src/main.tsx` — provider stack

Minimal stack: `KrashProvider` on the outside, the remaining contexts inside. The reference implementation's order: `KrashProvider → CurrencyProvider → LanguageProvider → SettingsProvider → GameConfigProvider → DeviceProvider → NavigationProvider → App` (`NavigationProvider` — the app's own popup/sidebar state). The reference implementation does not use `StrictMode`.
```
import { createRoot } from 'react-dom/client';
import * as SFS2X from 'sfs2x-api';
import {
  KrashProvider,
  CurrencyProvider,
  SettingsProvider,
  GameConfigProvider,
  DeviceProvider,
} from '@krash/react';
import App from './App';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://your-api.example.com';
const SFS_HOST = import.meta.env.VITE_SFS_HOST ?? 'ws.your-api.example.com';
const GAME_ID = import.meta.env.VITE_GAME_ID ?? 'your_game';

createRoot(document.getElementById('root')!).render(
  <KrashProvider
    apiBaseUrl={API_BASE_URL}
    sfsHost={SFS_HOST}
    gameId={GAME_ID}
    sfs2xModule={SFS2X}
    renderError={(error, lobbyUrl) => (
      <div>
        <p>{error}</p>
        {lobbyUrl && <a href={lobbyUrl}>Back to lobby</a>}
      </div>
    )}
  >
    <CurrencyProvider>
      <SettingsProvider>
        <GameConfigProvider>
          <DeviceProvider>
            <App />
          </DeviceProvider>
        </GameConfigProvider>
      </SettingsProvider>
    </CurrencyProvider>
  </KrashProvider>
);

```

`LanguageProvider` needs `t` and `changeLanguage` — the reference implementation feeds it with `react-i18next`. If you don't have i18n, skip it. Context details — 12-contexts.

## `KrashProvider` props

Source: `packages/react/src/KrashProvider.tsx`. `KrashProviderProps extends KrashConfig`, i.e. every `KrashConfig` field (see 02-configuration) is passed directly as a prop.

| Prop | Type | Required | Description |
| `sfs2xModule` | `any` | yes | `import * as SFS2X from 'sfs2x-api'` |
| `apiBaseUrl` | `string` | yes | REST base URL (`/seamless/...`) |
| `sfsHost` | `string` | yes | SmartFox host |
| `sfsPort`, `useSSL`, `sfsZone`, `gameId`, `storage`, `reconnect`, `keepAliveInterval`, `loginTimeout`, `debug` | — | no | `KrashConfig` fields, defaults in 02 |
| `launchUrl?` | `string` | no | The URL from which `t`, `gid`, `lang`, `platform`, `currency`, `lobbyUrl`, `exitUrl`, `userId` are read. Default — `globalThis.location.href` |
| `onLaunched?` | `(session: LaunchSession) => void` | no | `client.launch()` completed successfully (see below for what "completed" means) |
| `onLaunchError?` | `(error: Error) => void` | no | `client.launch()` failed (REST exchange/demo error, `KrashClient is destroyed`). **Not called** on `session-expired` or when `relaunchDemo()` fails |
| `renderError?` | `(error: string, lobbyUrl: string \| null) => ReactNode` | no | When `launchStatus === 'error'`, **replaces** `children`. If absent — `children` is still rendered and you check `useKrashState().launchError` yourself |
| `children` | `ReactNode` | yes | — |

What **does not exist**: `renderLoading`. In the `idle` and `loading` statuses `children` is rendered as usual — you show the loader yourself (example below).

Provider behavior you need to know:

- `KrashClient` is created once, in a `useRef`; `launch()` runs once on mount; `client.destroy()` on unmount.
- The context value **is not memoized** — components using `useKrashClient()`/`useKrashState()` re-render on every state change of the provider (`launchStatus`, `session`, `launchError`).
- On the `session-expired` event the provider sets `launchStatus='error'`, `session=null`, `launchError='Session rejected by server'`.
- `relaunchDemo()` first calls `launchDemo()`, sets `launchStatus='ready'` and **only after that** starts `client.launch()` again — i.e. `ready` is set before the reconnect completes.
- `isDemo`: if there is a `session` — `session.mode === 'demo'`; until there is one — `launchService.isDemoMode(launchUrl)` (`mode=demo` in the URL or no `t`).
- `lobbyUrl`/`exitUrl` are read once from the URL on mount.

## What happens on launch (as in the code)

`KrashProvider` → `client.launch(sfs2xModule, launchUrl)` (`KrashClient.ts:223-279`):

1. **Banner** — `console.log('[Krash SDK] v0.1.0')`, always, regardless of `debug`.
1. **`LaunchService.launch(url)`** (`LaunchService.ts:291-325`):
1. URL parsing: `t` → `oneShotToken`, `gid`, `lang`, `platform`, `currency`, `lobbyUrl`, `exitUrl`, `userId`.
1. **`t` is present and `krash.launch.session` in localStorage has the same `oneShotToken`** (page refresh) → no exchange happens; the saved session is merged with the URL's `gid`/`lang`/`currency`/`platform`, `mode` is set according to the URL's `mode=demo`, `restoredFromStorage: true`.
1. **`t` is present and new** → `POST {apiBaseUrl}/seamless/session/exchange`, body `{ "one_shot_token": "<t>" }`. The response is `SessionExchangeResponse` (`result_code`, `session_token`, `currency`, `game_id`, `mode`, `lang`, `platform`, `heartbeat_interval_seconds`). `result_code !== 0` or an empty `session_token` → `Error`. The session is saved in `krash.launch.session`.
1. **No `t`** → demo: `GET {apiBaseUrl}/seamless/launch/demo?gameId=<gid>&lang=<lang>&platform=<desktop|mobile>&currencyCode=<currency>&userId=<userId>` (`lang`, `currencyCode`, `userId` only if present; `platform` — via `resolvePlatformForApi()`). The response is `{ result_code, launch_url }`; `t` is read from `launch_url` and the same exchange happens. Then `updateBrowserUrl(launch_url)` (`history.replaceState` — the query parameters of `launch_url` are added to the current URL) and `addDemoModeToUrl()` (`mode=demo`).
1. `connectionManager.setIsDemo(session.isDemo)`, `setOnDemoRelaunch(...)` (see 09-advanced), currency → `BettingEngine.setCurrency`.
1. **`ConnectionManager.connect(sessionToken, sfs2xModule)`** — creates `new SFS2X.SmartFox({ host, port, useSSL, zone })`, attaches listeners and calls `sfs.connect()`. `connect()` **does not wait** for login — the `launch()` promise resolves as soon as the socket connect starts. Therefore `launchStatus === 'ready'` and `onLaunched` mean "REST launch finished, WebSocket connect started", not "the game is ready".

On the SmartFox side (`ConnectionManager.ts`):

| SFS event | What the SDK does | Events you receive |
| `CONNECTION` (success) | login timeout (`loginTimeout`, 10000 ms); `LoginRequest('session_token', '', { token: sessionToken }, zone)` | `connection-change {state:'connected'}`, `server-connected` |
| `LOGIN` | `JoinCrash` + `GetGameConfig` extension requests; `enableLagMonitor`; keep-alive `GetBalance` every 5000 ms | `connection-change {state:'checking'}`, `username {username}` |
| `LOGIN_ERROR` / login timeout / CONNECTION_LOST while waiting for login | in demo, `onDemoRelaunch` once; otherwise | `session-expired` |
| `ROOM_JOIN` (the server joins you to the room itself) | `GetRoundBets`, `GetRoundMyBets`, `GetMyHistory` | `bet-update` (x N), `round-my-bets`, `my-history` |
| `JoinCrashOk` (extension response) | `GetHistory` + `GetFreerounds` | in order: `connection-change {state:'connected'}` → `currency-mode` → `balance` → `freeround-state` (grant or `null`); asynchronously later `game-history`, `freeround-list` |
| `GameConfig` | `store.gameConfig`, currency | `game-config` |

"The game is ready" practically means: `connectionState === 'connected'` **after JoinCrashOk** and `gameConfig !== null`. Note that `connected` is emitted twice — on the socket's CONNECTION (before login) and on JoinCrashOk; between them it is `checking`.

## Demo mode

It is demo if there is no `t` in the URL **or** it says `mode=demo` (`LaunchService.isDemoMode`). Example:
```
https://your-game.com/?gid=your_game&mode=demo&lang=ka&currency=GEL

```

Launching demo is the `GET /seamless/launch/demo` path described above. When the demo session expires (login timeout / LOGIN_ERROR / CONNECTION_LOST while waiting for login), `ConnectionManager` calls `onDemoRelaunch` **once** — a callback that `KrashClient.launch()` sets and which obtains a new demo session and reconnects. If that also fails — `session-expired`. Manual restart from the UI — `useKrashState().relaunchDemo()`.
>

Do **not** wire the "Reload" button of a connection-lost overlay to `relaunchDemo()` in a real-money session — it swaps the player into demo. Call `relaunchDemo()` only when `isDemo === true`; on a real session use `window.location.reload()`.

## Saved session reuse rule

`krash.launch.session` (localStorage) is used **only** when there is a `t` in the URL and it exactly matches the saved `oneShotToken` (`LaunchService.ts:297`). This is the page refresh case — the server would not allow exchanging one one-shot token twice. A different `t` → a new exchange, the saved session is overwritten. Without `t` the saved session is **not** used — a new demo is always launched.

## Loader gate — `useKrashState().launchStatus`

Since `renderLoading` does not exist and `ready` does not wait for login, build the loader like this:
```
import type { ReactNode } from 'react';
import { useKrashState, useConnectionStatus, useGameConfig } from '@krash/react';

export function LoaderGate({ children }: { children: ReactNode }) {
  const { launchStatus, launchError, lobbyUrl } = useKrashState();
  const { state } = useConnectionStatus();
  const gameConfig = useGameConfig();

  if (launchStatus === 'error') {
    return (
      <div>
        <p>{launchError ?? 'Launch failed'}</p>
        {lobbyUrl && <a href={lobbyUrl}>Lobby</a>}
      </div>
    );
  }

  // 'idle' | 'loading' — the REST launch is still in progress;
  // 'ready' but SFS is not yet at JoinCrashOk or GameConfig has not arrived.
  const ready = launchStatus === 'ready' && state === 'connected' && gameConfig !== null;
  if (!ready) {
    return <div className="loader">Loading…</div>;
  }

  return <>{children}</>;
}

```

`gameConfig !== null` matters: `GetGameConfig` is sent on LOGIN and without `minBet`/`maxBet`/`currencyCode` the betting panel cannot work. The reference implementation instead uses its own loader with three gates (server-connected, authenticated, assets-loaded) + a 15-second fallback and does not rely on `launchStatus` — both approaches are valid.

## First bet

```
import { useBalance, usePhase, useMultiplier, useBetting } from '@krash/react';
import { BetSlot, BetButtonVariant } from '@krash/react';

export function FirstBet() {
  const balance = useBalance();
  const phase = usePhase();
  const multiplier = useMultiplier();
  const { slotState, placeBet, cashout, cancelBet } = useBetting(BetSlot.Slot1);

  const onClick = () => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet:
        placeBet(slotState.betInputAmount);
        break;
      case BetButtonVariant.Cashout:
        cashout();
        break;
      case BetButtonVariant.Cancel:
      case BetButtonVariant.CancelWaiting:
        cancelBet();
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <p>Balance: {balance}</p>
      <p>{phase} {multiplier.toFixed(2)}x</p>
      <button onClick={onClick} disabled={slotState.isButtonDisabled}>
        {slotState.buttonVariant}
      </button>
    </div>
  );
}

```

`slotState.buttonVariant` is computed by the SDK (`computeButtonVariant`), you only do the mapping to text/style. You can call `placeBet` in any phase — outside BETTING_OPEN the bet is queued (`hasPendingBet`) and sent on the next round. Full logic — 04-betting.

## Next steps

- Configuration and persistence — 02-configuration
- Phases and tick — 03-game-phases
- Bets, button variants — 04-betting
- vanilla `KrashClient` API — 16-krashclient-api
- Provider checklist — 15-integration-checklist

