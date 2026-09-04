<!-- source: https://krash-sdk-docs.playcore.live/en/panels/01-loader-and-launch/ -->

# 01. Loader and Launch Error Screen

The boot loader is a full-screen splash that is visible from the moment the page opens until the connection to the server is established, the session is confirmed and the Phaser canvas draws its first frame. The launch error screen appears when the token exchange / SFS login failed or the server rejected the session. Both look the same on desktop and on mobile (fixed, `inset: 0`).

## What it shows

Loader (`MainLoader`): - the game logo and the provider logo - progress bar — 10 % initial + 30 % per gate, 100 % at the end - three checklist items: "Connecting to server", "Authentication", "Loading assets" (spinner → done)

Launch error screen (`LaunchErrorScreen`): - title + description (i18n `sessionExpired.*`) - "Close game" button — only if `lobbyUrl` exists and is a safe `http(s)` URL

## SDK sources

| Data | Source | Type | Note |
| launch status | `useKrashState().launchStatus` | `'idle' \| 'loading' \| 'ready' \| 'error'` (`KrashLaunchStatus`) | string union, not the `LaunchStatus` enum. `'ready'` = token exchange **and** SFS connect finished (`KrashProvider.tsx:72-75`) |
| launch error | `useKrashState().launchError` | `string \| null` | passed as the first argument to `renderError` |
| `lobbyUrl` / `exitUrl` | `useKrashState().lobbyUrl`, `.exitUrl` | `string \| null` | from the URL query (`LaunchService.parseUrlParams`, `LaunchService.ts:44-45`); the second argument of `renderError` is `lobbyUrl` |
| socket connected | `client.on('server-connected')` | `undefined` | on the SFS `CONNECTION` event, before login (`ConnectionManager.ts:277-278`) |
| connection state | `client.on('connection-change')` | `{ state: 'connected' \| 'disconnected' \| 'checking' }` | `connected` arrives twice: on the socket CONNECTION (`:277`) and on `JoinCrashOk` (`:386`); `checking` between LOGIN and JoinCrashOk (`:317`) |
| session rejected | `client.on('session-expired')` | `undefined` | `KrashProvider` turns this into `launchStatus='error'` (`KrashProvider.tsx:118-124`) |

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| page open | `KrashProvider` mount → `client.launch(sfs2xModule, launchUrl)` | URL parse → token exchange (`POST …/exchange`, body `{ one_shot_token }`) or demo launch → SFS connect → `LoginRequest` → `JoinCrash` + `GetGameConfig` (see 13-connection-and-protocol) |
| "Close game" on the error screen | `closeGame()` (a skin helper) | does not touch the SDK — `window.parent.location.href = lobbyUrl`, fallback `window.location.href`, if there is no URL → `globalThis.close()` |

The loader has no actions — it only waits for events.

## States and edge cases

- **`idle` / `loading`**: `KrashProvider` still renders the children — the SDK **does not have** a `renderLoading`. Showing the loader is the skin's responsibility.
- **`error` + `renderError` is given**: `KrashProvider` renders `renderError(launchError, lobbyUrl)` **instead of** the children (`KrashProvider.tsx:137-143`). The whole App tree (including the loader) unmounts.
- **`error` + no `renderError`**: the children are still rendered — the skin must check `launchStatus === 'error'` itself.
- **`session-expired`**: arrives on login timeout (10 000 ms), on a failed demo relaunch and on a server reject → `launchStatus='error'`, `session=null`. `onLaunchError` is **not** called in this case.
- **`relaunchDemo()`**: `launchStatus` is first `'loading'`, then `'ready'` — before the reconnect completes (`KrashProvider.tsx:87-101`). The loader cannot rely on this, which is why the reference implementation also listens to `server-connected`.
- **Slow connection / assets**: the reference implementation has a 15 000 ms fallback — if all three gates have not finished, the loader is hidden anyway and an error is logged.
- **Reconnect (CONNECTION_LOST)**: `launchStatus` does not change (stays `'ready'`). The loader must **not** appear — there is a separate overlay for this (`ConnectionLostOverlay`, outside the scope of this chapter).
- **Frozen**: does not affect the loader.

## Reference implementation

Structure: - `App` — the two flags `loadApp` / `hideLoader`; `MainLoader` always renders first, the rest of the tree after `loadApp` - `MainLoader` — waiting for the three gates on the `EventBus` (the app's local `Phaser.Events.EventEmitter`), progress, 15 s fallback - `LOADER_EVENTS` constants and progress shares - `SdkEventBridge` — SDK events → EventBus `loader:*` - the Phaser scene — its first `POST_UPDATE` → `loader:assets-loaded` - `LaunchErrorScreen` — the `renderError` UI - `isSafeRedirectUrl`, `closeGame` — helpers - the `renderError` prop for `KrashProvider` at the root

**Important detail:** `MainLoader` calls `onLoadApp(true)` as soon as it mounts, so the whole App tree (Phaser, `SdkEventBridge`, betting) mounts **immediately** behind the loader. The loader only covers visually — it does not "stop" anything. This is the reference implementation's choice so that Phaser loads assets in parallel with the loader.

Reference implementation — the App tree with the two flags:
```
const [loadApp, setLoadApp] = useState<boolean>(false);
const [hideLoader, setHideLoader] = useState<boolean>(false);

return (
  <>
    <OrientationLockOverlay />
    {!hideLoader && <MainLoader onHideLoader={() => setHideLoader(true)} onLoadApp={() => setLoadApp(true)} />}
    {loadApp && <>
      <SdkEventBridge />
      <ConnectionLostOverlay />
      <PhaserGameWrapper />
      <BettingEngine>
        <AppShell> … </AppShell>
      </BettingEngine>
      <ToastArea />
    </>}
  </>
);

```

The three gates and who fires them:

| EventBus event | Source | Fired by |
| `loader:server-connected` | SDK `server-connected` **or** the first `connection-change {state:'connected'}` (both close the same gate, dedupe with the `receivedEvents` Set) | `SdkEventBridge` |
| `loader:authenticated` | `useKrashState().launchStatus === 'ready'` | `SdkEventBridge` |
| `loader:assets-loaded` | the Phaser scene's first `POST_UPDATE` (not `create()` — so that a frame is already drawn on the canvas) | the Phaser scene |

Reference implementation — waiting for the gates and the fallback (trimmed):
```
const finishLoading = () => {
  setProgress(100);
  clearTimeout(fallbackTimerRef.current);
  hideTimerRef.current = setTimeout(() => { onHideLoader?.(true); }, 600);
};

ALL_EVENTS.forEach((ev) => {
  handlers[ev] = () => {
    if (receivedEvents.current.has(ev)) return;
    receivedEvents.current.add(ev);
    setProgress((prev) => prev + (LOADER_EVENT_PROGRESS[ev] ?? 0));
    const stepIndex = EVENT_STEP[ev];
    if (stepIndex !== undefined) setCompletedSteps((prev) => [...prev, stepIndex]);
    if (receivedEvents.current.size === ALL_EVENTS.length) finishLoading();
  };
  EventBus.on(ev, handlers[ev]);
});

fallbackTimerRef.current = setTimeout(() => {
  if (receivedEvents.current.size < ALL_EVENTS.length) {
    logger.error('[MainLoader] Timeout — forcing completion. Missing events:', …);
    finishLoading();
  }
}, LOADING_TIMEOUT_MS); // 15_000

```

Error screen — the `renderError` prop and the "Close game" button:
```
<KrashProvider … renderError={(error, lobbyUrl) => (
  <LaunchErrorScreen error={error} lobbyUrl={lobbyUrl} />
)}>

// LaunchErrorScreen
{lobbyUrl && isSafeRedirectUrl(lobbyUrl) && (
  <button onClick={closeGame}>{t('sessionExpired.closeGame')}</button>
)}

```

Redirect protection (`javascript:`, `data:` etc. are blocked):
```
export const isSafeRedirectUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
};

```

**The SDK does:** the launch flow, `launchStatus`, `session-expired` → `'error'`, replacing the children via `renderError`, parsing `lobbyUrl`/`exitUrl`. **UI policy (skin responsibility):** the three-gate idea, the Phaser `POST_UPDATE` gate, the 15 s fallback, the 600 ms hide delay, immediate mount of the tree, the `closeGame()` fallback to `globalThis.close()`, `isSafeRedirectUrl`. `LaunchErrorScreen` does not show the `error` argument (`_error`) — only static i18n text.

## Minimal example (React + Vite)

Instead of the three gates, a gate on `launchStatus` is enough — it is simpler, it just does not wait for the Phaser assets to load. `renderError` covers the error, the gate covers `idle`/`loading`.
```
import { createRoot } from 'react-dom/client';
import * as SFS2X from 'sfs2x-api';
import { KrashProvider, useKrashState } from '@krash/react';
import type { ReactNode } from 'react';

const isSafeUrl = (url: string) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

function LaunchError({ error, lobbyUrl }: { error: string; lobbyUrl: string | null }) {
  return (
    <div className="launch-error">
      <h2>Session error</h2>
      <p>{error}</p>
      {lobbyUrl && isSafeUrl(lobbyUrl) && (
        <button onClick={() => { window.parent.location.href = lobbyUrl; }}>Back to lobby</button>
      )}
    </div>
  );
}

function LaunchGate({ children }: { children: ReactNode }) {
  const { launchStatus } = useKrashState();
  // 'error' never arrives here — renderError has already replaced the children
  if (launchStatus !== 'ready') return <div className="splash">Connecting…</div>;
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <KrashProvider
    apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
    sfsHost={import.meta.env.VITE_SFS_HOST}
    gameId="my_game"
    sfs2xModule={SFS2X}
    renderError={(error, lobbyUrl) => <LaunchError error={error} lobbyUrl={lobbyUrl} />}
  >
    <LaunchGate>
      <Game />
    </LaunchGate>
  </KrashProvider>,
);

```

`Game` is your main component. If you also want to wait for the canvas assets, add a second flag and open the gate only on both (the analogue of the reference implementation's `receivedEvents` Set).

## Common mistakes

- Treating `launchStatus === 'ready'` as "the socket is ready too": `ready` means `client.launch()` resolved, which happens after the SFS connect, but in the case of `relaunchDemo()` `ready` is set before the reconnect.
- Ignoring the error without `renderError` — the children are still rendered, the game is left with an "empty" screen.
- Relying on `onLaunchError` for `session-expired` — it is only called on a `launch()` reject.
- Redirecting to `lobbyUrl`/`exitUrl` without checking the protocol — open redirect.
- Unmounting the loader only on `server-connected` — this arrives **before** login; the balance and config are not there yet.
- Showing the loader again on reconnect — `launchStatus` does not change, while `connection-change` gives a `disconnected`/`checking`/`connected` cycle; use a separate overlay for this.

