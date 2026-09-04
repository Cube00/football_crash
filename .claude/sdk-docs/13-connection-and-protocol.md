<!-- source: https://krash-sdk-docs.playcore.live/en/13-connection-and-protocol/ -->

# 13. Connection & Protocol

This chapter describes how the SDK establishes a connection (REST launch → SmartFox login → JoinCrash), how it behaves on reconnect and what each value of `ConnectionState` means. The wire-level fields (every `cmd`, every field, the exact shape of the REST endpoints) are in a separate chapter — 17-wire-protocol.

## Architecture

```
KrashClient.launch(sfs2xModule, url?)
  ├─ LaunchService      → REST: /seamless/session/exchange | /seamless/launch/demo
  └─ ConnectionManager  → SFS2X WebSocket (sfs2x-api peer dependency)
       └─ SfsProtocol   → SFSObject (de)serialization, slot 1/2 ↔ BetSlot 0/1

```

`ConnectionManager` and `SfsProtocol` are exported from `@krash/sdk` (index.ts:42-44), but `KrashClient`'s internal instance is `private` — you have no access to it. `KrashClient` **has no `disconnect()`**; the only way to close the connection is `client.destroy()` (KrashClient.ts:282-298), which also stops reconnect and removes all listeners. `KrashProvider` calls this on unmount.

## Launch (REST)

`LaunchService.launch(url)` (LaunchService.ts:291-325):

| URL param | Field in `LaunchParams` |
| `t` | `oneShotToken` |
| `gid` | `gameId` |
| `lang`, `platform`, `currency`, `userId` | same name |
| `lobbyUrl`, `exitUrl` | redirects (the SDK does not use them, `useKrashState()` returns them) |
| `mode=demo` | demo-mode marker for refresh |

1. `t` is present and the same `oneShotToken` is stored in localStorage's `krash.launch.session` → exchange does **not** happen, the stored session is returned (the URL's `gid/lang/currency/platform` override it). This is the page-refresh case.
1. `t` is present and new → `POST /seamless/session/exchange` → the session is stored.
1. `t` is absent → `launchDemo()`: `GET /seamless/launch/demo` → a new `t` from `launch_url` → exchange → the session is stored, the launch parameters and `mode=demo` are added to the browser URL (`history.replaceState`).

`LaunchSession.heartbeatIntervalSeconds` is stored, but the SDK does not use it anywhere. The session's shape — 09-advanced.

## SFS connection sequence

ConnectionManager.ts:217-243, 268-351, 385-441. Every `connection-change` emit is also reflected in `store.connectionState` (KrashClient.ts:189-191).
```
doConnect()                           connection-change: disconnected   (only if it is not a reconnect)
  new SmartFox({host, port, useSSL, zone}); sfs.connect()
SFSEvent.CONNECTION success           connection-change: connected  +  server-connected
  loginTimeout (10000 ms) starts
  LoginRequest('session_token', '', { token: sessionToken }, zone)
SFSEvent.LOGIN                        connection-change: checking
  → JoinCrash, GetGameConfig
  enableLagMonitor(true, 4, 5); 'username' event; keep-alive starts
SFSEvent.ROOM_JOIN (the server joins us)  → GetRoundBets, GetRoundMyBets, GetMyHistory(50, 0)
← GameConfig                          game-config
← RoundBets / RoundMyBets / MyHistory bet-update ×N / round-my-bets / my-history
← JoinCrashOk                         connection-change: connected → currency-mode → balance → freeround-state
  → GetHistory(50), GetFreerounds
← History / GetFreeroundsOk           game-history / freeround-list  (asynchronously, later)

```

Important details:

- `connected` is emitted **twice**: when the socket opens (before login) and on `JoinCrashOk`. Between them is `checking`. If you need "the game is ready" — the `connected` that follows `JoinCrashOk` (after `server-connected`), or simply the first arrival of `balance`/`freeround-state`.
- `JoinRoomRequest` is **not** sent — the server joins us to the room after login; the SDK only listens for `ROOM_JOIN`.
- `username` event: `sfs.mySelf.name`, if it is not `'session_token'`. Persistence is bound to this (`<username>:<gameId>`), see 09-advanced.
- The response to `GetGameConfig`, `GameConfig`, usually arrives before `JoinCrashOk`, but the order is not guaranteed.

## `ConnectionState`

```
type ConnectionState = 'connected' | 'disconnected' | 'checking';   // enums.ts:94

```

| Value | When | What it means for the UI |
| `disconnected` | initial; `doConnect()` on the first connect; `CONNECTION` fail; `CONNECTION_LOST`; when scheduling every reconnect attempt; when max attempts are exhausted | there is no connection. Whether a reconnect is in progress or not — you cannot tell separately, there is no other event |
| `connected` | the socket opened (before login!) and on `JoinCrashOk` | the second `connected` = the game state is synchronised |
| `checking` | between `LOGIN` and `JoinCrashOk` | "Syncing…" |

The `ConnectionManager.state` getter (ConnectionManager.ts:83-86) looks only at `sfs.isConnected` and never returns `checking` — the store's `connectionState` is filled from events and is more accurate.

## Login timeout and `session-expired`

`session-expired` (payload `undefined`) is emitted (ConnectionManager.ts:285-298, 332-345, 357-374; KrashClient.ts:264-266):

| Source | Condition |
| Login timeout | `LOGIN` has not arrived within `loginTimeout` (default **10000 ms**) of `CONNECTION` |
| `LOGIN_ERROR` | the server rejected the token |
| `CONNECTION_LOST` while waiting for login | `awaitingLogin === true` — reconnect does **not** start |
| Demo relaunch failed | `launchDemo()` or the repeated `connect()` ended with an exception |

In all three SFS cases the socket is closed (`isManuallyDisconnected = true`, `cleanup()`), no reconnect happens.

**Demo relaunch**: if `session.isDemo` and `demoRelaunchAttempted === false`, instead of `session-expired` the `onDemoRelaunch` callback is called once — it is set in `KrashClient.launch()` (KrashClient.ts:246-267): `launchDemo()` with a new token and `connectionManager.connect()` again. `demoRelaunchAttempted` becomes `false` again on every `connect()` (ConnectionManager.ts:118), meaning that after a successful relaunch a new failure will get one more attempt. On a real-money session a relaunch never happens.

`KrashProvider` on `session-expired` sets `launchStatus = 'error'`, `session = null`, `launchError = 'Session rejected by server'` (KrashProvider.tsx:118-124); `onLaunchError` is **not** called. If `renderError` is passed, it replaces the children. `relaunchDemo()` (`useKrashState`) — `launchDemo()` + `client.launch()` again; it sets `ready` before the reconnect completes (KrashProvider.tsx:86-106).
>

Do **not** wire Reload to `relaunchDemo()` in a real-money session — it swaps the player into demo; use `window.location.reload()`. `relaunchDemo()` only when `isDemo === true`.

## Keep-alive

After `LOGIN`, every `keepAliveInterval` (default **5000 ms**) a `GetBalance` is sent (ConnectionManager.ts:648-655) → `Balance` → `balance` event. This is **only** a balance sync — there is no response timeout, liveness check or reconnect trigger. The interval stops on `cleanup()` and starts again on every login.

## Lag monitor

`sfs.enableLagMonitor(true, 4, 5)` (ConnectionManager.ts:319) — SmartFox's built-in ping every 4 seconds, the average of 5 samples. `SFSEvent.PING_PONG` → `ping-pong { lagValue }` (ms). `@krash/react`'s `useConnectionStatus()` returns this as `lagMs` in the form `{ state, lagMs }` (useConnectionStatus.ts:10-22). If you write your own connection hook (e.g. bucketing lag into Excellent/Good/Medium/Low, treating 10 s without a ping as Disconnected), do **not** reuse the SDK hook's name — `@krash/react`'s `useConnectionStatus()` returns `{ state, lagMs }`, and a same-named local hook makes imports ambiguous.

## Reconnect

The trigger is **only** `SFSEvent.CONNECTION_LOST` after login (and `CONNECTION` success=false), ConnectionManager.ts:357-377, 624-644:
```
CONNECTION_LOST                       connection-change: disconnected
attemptReconnect()
  attempts >= maxAttempts (100)  →    connection-change: disconnected; stop (there is no other event)
  otherwise: attempts += 1            connection-change: disconnected
  delay = min(baseDelay × 2^(attempts−1), maxDelay)  →  1000, 2000, 4000, 8000, 16000, 30000, 30000, …
  setTimeout(doConnect, delay)        (on reconnect doConnect does not emit an additional 'disconnected')
CONNECTION success                    attempts = 0; then the full login/JoinCrash sequence above

```

After a reconnect everything arrives again from the server side. On the store side:

- `KrashStore.reset()` is **never** called — `slots`, `balance`, `freeround`, the history slices keep their old values until new responses overwrite them.
- Bets: until `RoundMyBets` the slots show the **old** bets. `round-my-bets` restores `ACTIVE`/`PLACED`/`CASHED_OUT` bets with `id: ''` (BettingEngine.ts:752-781); bets with other statuses are not removed — they are cleared on the `phase-change` of the next `BETTING_OPEN`.
- `isSending`/`isCashingOut`/`isCancelling` are not cleared on reconnect — their own timeouts (5000/3000/3000 ms) will remove them.
- `username` is emitted again; the persistence key guard (`lastBoundPersistenceKey`) does not allow a repeated hydrate.

`reconnect` config: `maxAttempts` (100), `baseDelay` (1000), `maxDelay` (30000) — `KrashConfig.reconnect`.

## Debugging

- `?debug=1` or `localStorage['krash:debug'] = '1'` (or `debug: true` in the config) → `[SDK:ConnectionManager] → PlaceBet {...}` / `← BetPlaced` logs on every request/response, `JoinCrashOk keys/dump`, `[FR] grant keys`. In the Network tab the SFS traffic consists of binary WebSocket frames and is not separately readable — the logs are more useful.
- `[Krash SDK] vX.Y.Z` is always printed to the console on `launch()` (KrashClient.ts:231).
- `ConnectionManager.pendingRequests` (`Map<cmd, sentAt>`, the last 10, ConnectionManager.ts:60-61, 135-146) — a `private` diagnostic field, it has no timeout logic and the response name differs from the request (`PlaceBet` → `BetPlaced`), so entries are rarely "resolved". Visible only from the debugger.
- Unknown `cmd` → `[SDK:ConnectionManager] unhandled cmd:` debug log, no exception.

## `ConnectionConfig` ↔ `KrashConfig`

```
export interface ConnectionConfig {          // ConnectionManager.ts:15-27
  host: string;                              // KrashConfig.sfsHost
  port: number;                              // sfsPort ?? 443
  useSSL: boolean;                           // useSSL ?? true
  zone: string;                              // sfsZone ?? 'BasicExamples'
  keepAliveInterval: number;                 // keepAliveInterval ?? 5000
  loginTimeout: number;                      // loginTimeout ?? 10000
  reconnect: { maxAttempts: number; baseDelay: number; maxDelay: number };  // 100 / 1000 / 30000
}

```

Mapping — KrashClient.ts:70-82. `apiBaseUrl` and `gameId` (default `'kings_move'` — legacy default, always pass your own `gameId`) go to `LaunchService`.

## Recommendations

1. "Reconnecting…" overlay — `@krash/react`'s `useConnectionStatus().state !== 'connected'`; or, more precisely, listen to `connection-change` and show "Syncing" for `checking`, "Reconnecting" for `disconnected`. Block the bet buttons until `JoinCrashOk`.
1. On `session-expired` redirect to the lobby (`useKrashState().lobbyUrl`) — a real-money session will no longer be restored automatically.
1. In demo, show the `relaunchDemo()` button only when `isDemo === true`.
1. The SDK does not separately report the exhaustion of `max attempts` — on a long `disconnected` (e.g. > 60 s) offer a Reload.
1. `lagMs > 500` — a network indicator; this is not a sign of a disconnect.

