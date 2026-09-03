<!-- source: https://krash-sdk-docs.playcore.live/en/panels/15-connection-and-network/ -->

# 15. Connection and network (Connection & Network)

Four UI elements depend on the connection state: the **connection-lost overlay** (full-screen, with a "Reload" button), the **network status bars** in the footer (4 bars + "Network Connection" text), the **frozen state** (`app--frozen` class when no tick has arrived for more than 2 seconds) and the **session-expired screen** (`renderError`, replaces the whole app). Desktop and mobile render identically.
>

**Name collision.** If you write your own connection hook, do not reuse the SDK hook name — `@krash/react`'s `useConnectionStatus()` returns `{ state: ConnectionState, lagMs }`, and a same-named local hook makes imports ambiguous. In this chapter the reference implementation's own hook is called `useNetworkStatus`.

## What it shows

- Overlay: Wi-Fi icon, "Connection lost" title, text, `Reload` button.
- Footer: 4 bars (Excellent 4 / Good 3 / Medium 2 / Low 1 / Checking 0 / Disconnected 0 + X) and text (always `t('info.networkConnection')`), next to it the local clock with GMT offset.
- Frozen: the `app--frozen` class on the whole app's wrapper.
- Session expired: "Session expired" title/text + "Close game" button, if `lobbyUrl` exists and is http(s).

## SDK sources

| Data | Source | Type | Note |
| Connection state | `useConnectionStatus().state` (`@krash/react`) / `client.on('connection-change', {state})` / store `connectionState` | `'connected' \| 'disconnected' \| 'checking'` | `KrashClient.ts:189-191` writes the store |
| Lag | `useConnectionStatus().lagMs` / `client.on('ping-pong', {lagValue})` | `number` (ms) | `ConnectionManager.ts:353-355`; SFS lag monitor `enableLagMonitor(true, 4, 5)` — roughly once every 4 seconds (`:319`) |
| Frozen | `useIsGameFrozen()` / `client.on('game-frozen', {frozen})` / store `isGameFrozen` | `boolean` | `FREEZE_TIMEOUT_MS = 2000` (`GameEngine.ts:15, 34-36`); the timer starts after the first tick |
| Session expired | `client.on('session-expired')` → `KrashProvider` `launchStatus = 'error'`, `launchError = 'Session rejected by server'` | — | `KrashProvider.tsx:118-124`; `renderError` **replaces** the children (`:137-143`) |
| `lobbyUrl`, `exitUrl`, `isDemo`, `relaunchDemo` | `useKrashState()` | `KrashProviderState` | `KrashProvider.tsx:14-23` |
| `hasEverConnected` | the skin's own hook (see below) | `boolean` | the SDK has no such field |

### `connection-change` sequence (SDK facts)

| Moment | state | Source |
| SFS socket `CONNECTION success` | `connected` (1st) + `server-connected` | `ConnectionManager.ts:277-278` |
| `LOGIN` OK → `JoinCrash` sent | `checking` | `:317` |
| `JoinCrashOk` | `connected` (2nd) | `:386` |
| `CONNECTION_LOST` | `disconnected` → reconnect backoff | `:358, 634` |
| socket connect failed | `disconnected` | `:304` |
| `maxAttempts` (100) exhausted | `disconnected` (final) | `:626-629` |

Reconnect: delay = `min(baseDelay · 2^(n-1), maxDelay)`, defaults `baseDelay 1000`, `maxDelay 30000`, `maxAttempts 100` (`KrashClient.ts:77-81`, `ConnectionManager.ts:636-639`). Keep-alive: `GetBalance` every `5000` ms (`:648-655`). Reconnect happens **only** on `CONNECTION_LOST` — a drop during the login stage yields `session-expired`.

`session-expired` comes from: login timeout (`10000` ms, `:285-298`), `LOGIN_ERROR` (`:332-345`), `CONNECTION_LOST` while waiting for login (`:361-374`), a failed demo relaunch (`KrashClient.ts:264-266`). In a demo session, in the first three cases the SDK first tries `onDemoRelaunch` **once** (`demoRelaunchAttempted`).

After a reconnect **the store's slots keep the old bets** until `ROOM_JOIN` → `GetRoundMyBets` → `round-my-bets` arrives (`ConnectionManager.ts:347-351`, `BettingEngine.ts:752-781`; restored bets have `id: ''`).

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Overlay `Reload` | `window.location.reload()` | full relaunch; the stored session is restored with the same `oneShotToken` |
| Overlay `Reload` (only when `isDemo`) | `relaunchDemo()` | `KrashProvider.tsx:86-106`: `launchService.launchDemo(...)` → **a new demo session** (it replaces a real-money session with demo as well); `launchStatus = 'ready'` before the reconnect completes |
| Session expired → `Close game` | `closeGame()` → `window.parent.location.href = lobbyUrl` | does not involve the SDK |
| Frozen | nothing — CSS only | — |

## States and edge cases

- **First connection** — the reference implementation's overlay opens on `hasEverConnected && Disconnected`, so it is not visible during the loader. The initial value of `@krash/react`'s `state` is `'disconnected'` (`KrashStore.ts:45`) — guard yours with `launchStatus === 'ready'` too.
- **`checking`** — between LOGIN and `JoinCrashOk`; the reference implementation draws the bars as inactive, the overlay does not open.
- **Ping timeout** — the reference implementation sets `Disconnected` after 10 seconds of `ping-pong` silence (see the snippet below), even if the SDK says `connected`. Also on `window 'offline'`.
- **Reconnect** — the SDK fires `disconnected` on every attempt; the overlay is open until `connected` arrives. Bet buttons: the SDK's `computeButtonVariant` does **not** take the connection into account — blocking is your job (the reference implementation covers it with the overlay).
- **Frozen (2 s without tick)** — `isGameFrozen = true`; `false` when a tick arrives. In the reference implementation it is only a class, the buttons are not disabled. The SDK's BettingEngine does not check frozen.
- **Session expired in demo** — the SDK tries a relaunch itself once; `session-expired` comes only if that fails.
- **Session expired in real-money** — the `renderError` screen; `onLaunchError` is **not** called (only on the initial launch's exception).
- **Timing of `relaunchDemo` ready** — `setLaunchStatus('ready')` is called before `client.launch()` (`KrashProvider.tsx:97-100`); do not base your loader on it.
- **Freebet / autoplay** — autoplay does not stop on reconnect in the SDK; bets stay in the pending queue and are sent on the next `BETTING_OPEN`.

## Reference implementation

Building blocks:

- `useNetworkStatus` — the app's own hook: lag → `NetworkStatusState`, 10 s ping timeout, `hasEverConnected`, `window 'offline'`.
- `NetworkStatusState` enum — `Excellent | Good | Medium | Low | Checking | Disconnected`.
- `ConnectionLostOverlay` — overlay + `Reload`.
- `NetworkStatus` — bar rendering; `Footer` — `NetworkStatus` + `TimeDisplay`.
- `AppShell` — `app--frozen`.
- `LaunchErrorScreen` — the `renderError` screen ("Session expired" + "Close game").
- `SdkEventBridge` — `connection-change` → the loader's `SERVER_CONNECTED` (on the first `connected`) (16).

Reference implementation — lag classification and ping timeout (`NetworkStatusState` — the app's own enum):
```
const updateFromLag = useCallback((lagMs: number) => {
  if (lagMs < 80) setConnectionState(NetworkStatusState.Excellent);
  else if (lagMs < 150) setConnectionState(NetworkStatusState.Good);
  else if (lagMs < 300) setConnectionState(NetworkStatusState.Medium);
  else setConnectionState(NetworkStatusState.Low);
}, []);

useEffect(() => {
  const unsubs = [
    client.on('ping-pong', ({ lagValue }) => {
      const lagMs = Math.round(lagValue);
      lastPingTimeRef.current = Date.now();
      updateFromLag(lagMs);

      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = setTimeout(() => {
        const timeSinceLastPing = Date.now() - lastPingTimeRef.current;
        if (timeSinceLastPing >= PING_TIMEOUT_MS && hasEverConnectedRef.current) {
          setConnectionState(NetworkStatusState.Disconnected);
        }
      }, PING_TIMEOUT_MS);
    }),

```

Reference implementation — the overlay's open condition:
```
const { connectionState, hasEverConnected } = useNetworkStatus();

const isOpen = hasEverConnected && connectionState === NetworkStatusState.Disconnected;
if (!isOpen) return null;

```

The overlay's `Reload` button should call `window.location.reload()` (or `relaunchDemo()` — only when `isDemo`); see Common mistakes.

**UI policy (skin responsibility) vs SDK:** the lag buckets, the 10 s timeout, `hasEverConnected`, the overlay's Reload behaviour, the number of bars — skin. SDK: `connection-change`, `ping-pong`, `game-frozen`, `session-expired`, reconnect backoff, `renderError`.

## Minimal example (React + Vite)

```
import { useEffect, useRef, useState } from 'react';
import { useConnectionStatus, useIsGameFrozen, useKrashState } from '@krash/react';

export function ConnectionOverlay() {
  const { state, lagMs } = useConnectionStatus();
  const frozen = useIsGameFrozen();
  const { launchStatus, isDemo, relaunchDemo } = useKrashState();
  const [everConnected, setEverConnected] = useState(false);
  const lastPing = useRef(Date.now());
  const [pingStale, setPingStale] = useState(false);

  useEffect(() => { if (state === 'connected') setEverConnected(true); }, [state]);

  // the SDK ping arrives roughly every 4 s; 10 s of silence = the connection is effectively lost
  useEffect(() => { lastPing.current = Date.now(); setPingStale(false); }, [lagMs]);
  useEffect(() => {
    const id = setInterval(() => setPingStale(Date.now() - lastPing.current > 10_000), 1000);
    return () => clearInterval(id);
  }, []);

  if (launchStatus !== 'ready' || !everConnected) return null;

  const lost = state === 'disconnected' || pingStale;
  const bars = lagMs < 80 ? 4 : lagMs < 150 ? 3 : lagMs < 300 ? 2 : 1;

  return (
    <>
      <footer style={{ opacity: state === 'checking' ? 0.5 : 1 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} style={{ display: 'inline-block', width: 4, height: 6 + i * 3, marginRight: 2, background: !lost && i < bars ? '#3c3' : '#555' }} />
        ))}{' '}
        {lost ? 'No connection' : `${Math.round(lagMs)} ms`}
        {frozen && ' · server stalled'}
      </footer>

      {lost && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'grid', placeItems: 'center' }}>
          <div>
            <h2>Connection lost</h2>
            <p>Reconnecting… press Reload if it takes too long.</p>
            {/* demo → a new demo session; real-money → full reload, the session is restored from localStorage */}
            <button onClick={() => (isDemo ? void relaunchDemo() : window.location.reload())}>Reload</button>
          </div>
        </div>
      )}
    </>
  );
}

```

## Common mistakes

- **Wiring Reload to `relaunchDemo()` in a real-money session** — `relaunchDemo()` replaces any session with demo and the player ends up in demo; condition it on `isDemo` or use `window.location.reload()`.
- **Double `connected`** — `server-connected`/the first `connected` is the socket level, login/JoinCrash has not happened yet. "Game is ready" = `launchStatus === 'ready'`, not the first `connected`.
- **Overlay during the loader** — the initial `connectionState` is `'disconnected'`; an `everConnected`/`launchStatus` guard is required.
- **Expecting `onLaunchError` on `session-expired`** — it is not called; use `renderError` or `useKrashState().launchStatus === 'error'`.
- **Frozen = disconnected** — no: frozen means the socket is open but no tick is arriving (server pause/lag). Use separate text.
- **Waiting for the SDK to block the bet button** — `buttonVariant` does not take the connection into account; add `disabled` yourself.

