<!-- source: https://krash-sdk-docs.playcore.live/en/17-wire-protocol/ -->

# 17. Wire Protocol Reference

This chapter is for the teams that talk to the backend or hunt for a problem in the Network tab/logs. Here is every SmartFox extension `cmd` that the SDK sends or receives, every field (server name → SDK name → wire type → meaning), the parser functions from `packages/sdk/src/connection/SfsProtocol.ts` and the three REST endpoints. Connection sequence and reconnect — 13-connection-and-protocol; freeround lifecycle — 11-freerounds.

**Wire types** — the column gives the SFSObject getter the SDK reads the field with: `string` = `getUtfString`, `double` = `getDouble`, `int` = `getInt`, `long` = `getLong`, `bool` = `getBool`, `object` = `getSFSObject`, `array` = `getSFSArray`. In SmartFox a type mismatch (e.g. `double` instead of `int`) throws `SFSTypeError` — the field "simply" is not read. `?` = the SDK first checks with `containsKey`; without `?` the field is **required** and its absence throws in the parser.

## Transport

- `new SmartFox({ host, port, useSSL, zone })` — default `443`, `true`, `'BasicExamples'` (KrashClient.ts:70-82).
- Every request: `new ExtensionRequest(cmd, params, undefined)` — zone-level extension, no room is specified (ConnectionManager.ts:129-133). `send()` silently does nothing if the socket is closed.
- Every response/push: `SFSEvent.EXTENSION_RESPONSE` → `switch (cmd)` (ConnectionManager.ts:379-620).
- Slot mapping: server `slot` 1/2 ↔ `BetSlot.Slot1 = 0` / `Slot2 = 1` (`toSlot`/`toServerSlot`, SfsProtocol.ts:31-38). Every `slot` field in responses (except `BetUpdate`, see below) is already converted.

## Login

```
LoginRequest('session_token', '', SFSObject { token: string }, zone)     // ConnectionManager.ts:301-302

```

The username is `'session_token'`, the password is empty, `token` = `LaunchSession.sessionToken`. On `LOGIN` the server returns the real username in `sfs.mySelf.name`. `LOGIN_ERROR` → `session-expired` (on demo, relaunch first).

## Requests

| `cmd` | Parameters (wire type) | Builder | When it is sent | Response |
| `JoinCrash` | — | — | automatically on `LOGIN` | `JoinCrashOk` |
| `GetGameConfig` | — | — | automatically on `LOGIN` | `GameConfig` |
| `GetRoundBets` | — | — | automatically on `ROOM_JOIN` | `RoundBets` |
| `GetRoundMyBets` | — | — | automatically on `ROOM_JOIN` | `RoundMyBets` |
| `GetMyHistory` | `limit: int`, `offset?: int` | `buildHistoryObject` | automatically on `ROOM_JOIN` (`50, 0`); `client.getMyHistory(limit?, offset?)` | `MyHistory` |
| `GetHistory` | `limit: int` | `buildHistoryObject` | automatically on `JoinCrashOk` (`50`); `client.getHistory(limit?)` | `History` |
| `GetFreerounds` | — | — | automatically on `JoinCrashOk` and on `Error NO_BOUND_GRANT/GRANT_EXPIRED`; `client.getFreerounds()` / `useFreerounds().refresh()` | `GetFreeroundsOk` |
| `GetBalance` | — | — | every `keepAliveInterval` (5000 ms) after `LOGIN` | `Balance` |
| `PlaceBet` | `amount: double`, `currency: string`, `slot: int` (1/2), `autoCashoutAt?: double` (only if `> 1.0`), `grantId?: string` (only on an active freeround) | `buildPlaceBetObject` | `client.placeBet` / `useBetting().placeBet` / autoplay / pending drain on `BETTING_OPEN` | `BetPlaced` or `Error` |
| `Cashout` | `slot: int` | `buildSlotObject` | `client.cashout` | `CashoutDone` or `Error` |
| `CancelBet` | `slot: int` | `buildSlotObject` | `client.cancelBet` — only on a `Placed`/`Active` bet (pending is removed locally) | `CancelBetOk` or `Error` |
| `BindFreeround` | `grantId: string` | `buildBindFreeroundObject` | `client.bindFreeround` | `BindFreeroundOk` or `Error` |
| `UnbindFreeround` | — | — | `client.unbindFreeround` | `UnbindFreeroundOk` |
| `GetFreeroundHistory` | `page: int`, `pageSize: int` | `buildFreeroundHistoryObject` | `client.getFreeroundHistory(page = 1, pageSize = 10)` | `GetFreeroundHistoryOk` |

`currency` in `PlaceBet` — `GameConfig.currencyCode` if it arrived, otherwise `LaunchSession.currency` (KrashClient.ts:180-186, 270-273).

## Response / push → event

| `cmd` | Parser | Event(s) | Note |
| `JoinCrashOk` | inline + `parseFreeroundGrant` | `connection-change {connected}` → `currency-mode` → `balance`? → `freeround-state` | then `GetHistory` + `GetFreerounds` |
| `Tick` | `parseTick` | `tick` | push, ~100 ms in FLYING |
| `BetPlaced` | `parseBetPlaced` | `balance`? → `bet-placed` |  |
| `CashoutDone` | `parseCashoutDone` | `balance`? → `cashout-done` |  |
| `CancelBetOk` | `parseCancelBetOk` | `balance`? → `cancel-bet-ok` |  |
| `BetUpdateBroadcast` | `parseBetUpdate(p.bet)` | `bet-update` | push, other players' bets |
| `RoundBets` | `parseBetUpdate` ×N | `bet-update` ×N | a separate event for every element of the `bets` array |
| `RoundMyBets` | `parseRoundMyBets` | `round-my-bets` |  |
| `MyHistory` | `parseMyHistory` | `my-history` | parse error → `logger.error`, no event arrives |
| `History` | `parseHistory` | `game-history` | same |
| `Balance` | `parseBalance` | `balance` |  |
| `GameConfig` | `parseGameConfig` | `game-config` | + `store.gameConfig`, currency fallback |
| `BindFreeroundOk` | `parseFreeroundGrant` | `freeround-state` |  |
| `UnbindFreeroundOk` | — | `freeround-state: null` |  |
| `GetFreeroundsOk` | `parseFreeroundsList` | `freeround-list` |  |
| `GetFreeroundHistoryOk` | `parseFreeroundHistory` | `freeround-history` | parse error → log |
| `FreeroundCompleted` | `parseFreeroundCompleted` | `freeround-summary` | push |
| `Error` | `parseError` | `error` → `bet-error`? → `freeround-state: null`? | see below |
| `LostBet` | — | — | **ignored** (ConnectionManager.ts:481-482); the loss is derived from `phase-change CRASHED` |
| other | — | — | `unhandled cmd` debug log |

`balance`? = only if the payload has a `balance` field.

## Fields by response

### `JoinCrashOk` (ConnectionManager.ts:385-441)

| Server | Wire | SDK | Meaning |
| `currencyMode?` | string | `currency-mode { mode }` | `'multi'` (case-insensitive) → `'multi'`, anything else/absent → `'single'` |
| `balance?` | double | `balance` | wallet |
| `freeround_grant_id?` | string | — | if present, the whole object goes into `parseFreeroundGrant` → `freeround-state`; if not → `freeround-state: null` |
| grant fields |  |  | see "Grant fields" |

### `Tick` — `parseTick` (SfsProtocol.ts:101-115)

| Server | Wire | `TickPayload` | Meaning |
| `multiplier` | double | `multiplier` |  |
| `phase` | string | `phase` | `BETTING_OPEN` / `BETTING_CLOSING` / `FLYING` / `CRASHED`; unknown → the previous phase stays (GameEngine.ts:121-128) |
| `roundId?` | string | `roundId` | `''` if absent |
| `remainingMs?` | int | `remainingMs` | `0` if absent |
| `fairnessHash?`, `serverSeed?` | string | same | on the CRASHED tick |

### `BetPlaced` — `parseBetPlaced` (SfsProtocol.ts:117-135)

| Server | Wire | `BetPlacedPayload` | Meaning |
| `slot` | int | `slotIndex` | `toSlot` → 0/1 |
| `amount` | double | `amount` |  |
| `currency` | string | `currency` |  |
| `betId` | string | `betId` |  |
| `balance?` | double | `balance` | wallet after the bet |
| `freeround_grant_id?` | string | `freeroundGrantId` | on a free bet |
| `freeround_balance_remaining?` | double | `freeroundBalanceRemaining` | the grant's balance after this bet |
| `freeround_completed?` | bool | `freeroundCompleted` | `true` = this was the last free bet → `freeround-completed` hint |

### `CashoutDone` — `parseCashoutDone` (SfsProtocol.ts:340-367)

| Server | Wire | `CashoutDonePayload` | Meaning |
| `slot` | int | `slotIndex` |  |
| `multiplier` | double | `multiplier` |  |
| `payout` | double | `payout` | cash / `ZERO_BET` free bet: gross (`stake × mult`); `BET_FROM_WIN`: net (`stake × (mult − 1)`) |
| `betAmount?` | double | `betAmount` | when absent `payout / multiplier` (legacy fallback; incorrect on `BET_FROM_WIN`) |
| `balance?` | double | `balance` |  |
| `freeround_grant_id?` | string | `freeroundGrantId` |  |
| `betType?` | string | `betType` | `"BET"` / `"FREEBET"` |
| `betMode?` | string | `betMode` | `"ZERO_BET"` / `"BET_FROM_WIN"` — autoplay profit netting is based on this (KrashClient.ts:144-150) |

### `CancelBetOk` — `parseCancelBetOk` (SfsProtocol.ts:369-382)

| Server | Wire | `CancelBetOkPayload` |
| `slot` | int | `slotIndex` |
| `betId` | string | `betId` |
| `balance?` | double | `balance` |
| `freeround_grant_id?` | string | `freeroundGrantId` |
| `freeround_balance_remaining?` | double | `freeroundBalanceRemaining` — when absent the SDK does an optimistic restore (`+ bet.amount`) |

### `BetUpdateBroadcast` / `RoundBets` — `parseBetUpdate` (SfsProtocol.ts:398-418)

`BetUpdateBroadcast { bet: object }`, `RoundBets { bets: array<object> }`. Each `bet` object:

| Server | Wire | `BetUpdatePayload` | Meaning |
| `betId` | string | `betId` |  |
| `amount` | double | `amount` |  |
| `fakeIdentifier` | string | `fakeIdentifier` | **required** — the player's anonymous label |
| `currency?` | string | `currency` | empty/absent → `GameConfig.currencyCode` fallback |
| `status?` | string | `status` | default `'ACTIVE'`; `CASHED_OUT` etc. |
| `username?` | string | `username` | default `''` |
| `userId?` | int | `userId` |  |
| `slot?` | int | `slot` | **server 1/2, not converted** |
| `cashedOutAt?`, `payout?`, `autoCashoutAt?` | double | same |  |
| `roundId?` | string | `roundId` |  |

`parseBetUpdateBroadcast` (SfsProtocol.ts:384-396) is called, but the result is not used anywhere (ConnectionManager.ts:475).

### `RoundMyBets` — `parseRoundMyBets` (SfsProtocol.ts:420-440)

`{ roundId: string, bets: array }`, each element: `slot: int` → `slotIndex`, `amount: double`, `status: string`, `cashedOutAt?: double`, `payout?: double`, `freeround_grant_id?` **or** `freeroundGrantId?: string` → `freeroundGrantId`. BettingEngine restores only `ACTIVE`, `PLACED` and `CASHED_OUT` (if `payout` > 0) bets, with `id: ''`.

### `History` — `parseHistory` (SfsProtocol.ts:508-522)

`{ rounds: array }`: `roundId: string`, `crashAt: double`, `fairnessHash: string`, `serverSeed: string`, `startTimeMs: long` → `GameHistoryItem` with the same names.

### `MyHistory` — `parseMyHistory` (SfsProtocol.ts:524-607) and normalisation

Wire: `{ rounds: array, total: int, limit: int, offset: int }`; `rounds[i]`: `roundId: string`, `crashMultiplier: double`, `tickets: array`; `tickets[j]`: `betAmount: double`, `winAmount: double`, `createdAt: string`, `slot?: int`, + free bet markers.

The SDK returns **every ticket as a separate `round` entry** (`MyHistoryPayload.rounds`), with a single `bets[0]` element:

| SDK field | Source |
| `roundId` | **synthetic**: ``${roundId}-ticket-${j}`` — two tickets in one round get different ids; extract the server roundId with `split('-ticket-')[0]` |
| `timestamp` | `createdAt` |
| `totalBet` / `bets[0].betAmount` | `betAmount` |
| `totalWin` / `bets[0].netCash` | `winAmount` (despite the name it is not net — just `winAmount`) |
| `crashMultiplier` | `crashMultiplier` |
| `bets[0].multiplier` | **computed**: `winAmount > 0 ? winAmount / betAmount : 0` — not on the wire |
| `bets[0].slot` | `slot`, when absent `j + 1` (server numbering 1/2) |
| `bets[0].betType` | `'freebet'` if the ticket has any of the keys: `freeroundGrantId`, `freeround_grant_id`, `grantId`, `freeRoundGrantId`; or `isFreebet`/`isFreeBet: bool` = true; or `betType`/`bet_type: string` = `'freebet'` (case-insensitive). Otherwise `'classic'` |

With `?debug=1` the parser logs the keys and values of every ticket (`[SDK:SfsProtocol][HIST] ticket keys`) — for agreeing the fields with the backend.

### `Balance` — `parseBalance` (SfsProtocol.ts:609-611)

`balance: double` → `balance { balance }`.

### `GameConfig` — `parseGameConfig` (SfsProtocol.ts:479-506)

| Server | Wire | `GameConfig` | Note |
| `minBet`, `maxBet`, `maxWinAmount` | double | same |  |
| `maxBetsPerUser` | int |  |  |
| `currencyCode` | string |  | empty → `'USD'` |
| `hasMoreOptions` | bool |  |  |
| `currencyMinorUnits` | int |  | `0`/absent → `2` |
| `clientConfig?` | object | `clientConfig` | `version: int`, `defaultBet: double`, `defaultAutoCashout: double`, `multiplyButton: object {key: string, title: string, value: double}`, `speedButtons: array<object>` (same shape), `betStep?: double` |
| `configUpdatedAt` | long | `configUpdatedAt` | read **only** if `clientConfig` is present |

### `BindFreeroundOk` / `GetFreeroundsOk` — grant fields

`GetFreeroundsOk { grants: array<object> }` (`parseFreeroundsList`, SfsProtocol.ts:280-287); `BindFreeroundOk` and `JoinCrashOk` — the fields are at top level. Every grant → `parseFreeroundGrant` (SfsProtocol.ts:224-277):

| Server | Wire | `FreeroundGrant` | Meaning |
| `freeround_grant_id` | string | `grantId` |  |
| `freeround_status` | string | `status` | `AVAILABLE` / `IN_PROGRESS` / `COMPLETED` / `EXPIRED` / `CANCELLED` — cast, no validation |
| `freeround_balance_remaining` | double | `balanceRemaining` |  |
| `freeround_balance_initial?` | double | `balanceInitial` | when absent `= balanceRemaining` (legacy) |
| `freeround_rounds_played?` | int | `roundsPlayed` | default `0` |
| `freeround_bet_config` | string | `betConfigRaw`, `kind`, `betAmount`, `betMin`, `betMax`, `minCashout` | **required** JSON string, see below |
| `expiryDate?` | `freeround_expiry_date?` | `freeround_expires_at?` | `expiresAt?` | string | long | Date | `expiresAt` (ISO) | the first found in this order; `readSfsTimestamp` tries all three wire types (SfsProtocol.ts:174-200) |
| `createdAt?` | `grantedAt?` | `accruedAt?` | `freeround_created_at?` | string | long | Date | `accruedAt` (ISO) | same |

In `freeround-state`, `isActive = status === 'IN_PROGRESS'`; `FreeroundState` does not have `expiresAt/accruedAt/betConfigRaw`.

#### `freeround_bet_config` JSON (`parseBetConfig` SfsProtocol.ts:151-167, `extractMinCashout` SfsProtocol.ts:206-218)

```
{"totalBet": 2, "minCashOutCoeff": 1.5}          // → kind 'fixed', betAmount = betMin = betMax = 2, minCashout 1.5
{"minBet": 1, "maxBet": 10, "minCashOutCoeff": 2} // → kind 'range', betMin 1, betMax 10, betAmount 1
{"minBet": 5}                                     // → range, betMin = betMax = 5 (one bound copies the other)
{}  /  invalid JSON  /  ""                        // → fixed, 0 / 0 / 0, minCashout 1.01

```

- The presence of `totalBet` **takes priority** — if both `totalBet` and `minBet/maxBet` are present, the grant is fixed.
- Values are read with `parseFloat` — strings (`"2"`) work too.
- `minCashout`: `minCashOutCoeff ?? minCashout`; if absent, `NaN` or `<= 1` → `DEFAULT_MIN_CASHOUT = 1.01` (SfsProtocol.ts:138).

### `GetFreeroundHistoryOk` — `parseFreeroundHistory` (SfsProtocol.ts:290-316)

`{ entries: array, page?: int, page_size?: int, total_items?: long }` → `FreeroundHistoryPayload { entries, page (default 1), pageSize (default entries.length), totalItems (default entries.length) }`. Each entry:

| Server | Wire | `FreeroundHistoryEntry` | Meaning |
| `grant_id` | string | `grantId` |  |
| `status` | string | `status` | `COMPLETED` / `EXPIRED` / `CANCELLED` |
| `bet_mode?` | string | `kind` | `'BET_RANGE'` → `'range'`; anything else (e.g. `'FIXED_BET'`, absent) → `'fixed'` |
| `total_win` | double | `totalWin` |  |
| `rounds_played` | int | `roundsPlayed` |  |
| `free_round_balance` | double | `freeRoundBalance` |  |
| `completed_at?` | string | `completedAt` | default `''` |
| `expiry_date?` | string | long | Date | `expiryDate` | `readSfsTimestamp` |
| `min_cashout_coeff?` | double | `minCashout` |  |

### `FreeroundCompleted` — `parseFreeroundCompleted` (SfsProtocol.ts:319-338)

| Server | Wire | `FreeroundSummaryPayload` | Meaning |
| `grant_id` | string | `grantId` |  |
| `rounds_played` | int | `roundsPlayed` |  |
| `balance_used` | double | `balanceUsed` |  |
| `balance_remaining` | double | `balanceRemaining` | may be > 0 on EXPIRED |
| `total_win` | double | `totalWin` | authoritative |
| `reason?` | string | `reason` | `COMPLETED` / `EXPIRED` / `CANCELLED`; other/absent → `'COMPLETED'` |

On `COMPLETED` the server sometimes sends **two** pushes (an early `total_win = 0`, then the final one) — the SDK's stash/overwrite logic covers this (11 §6).

### `Error` — `parseError` (SfsProtocol.ts:613-615), ConnectionManager.ts:595-614

| Server | Wire | Behaviour |
| `error` | string | `error { message }` always |
| `slot?` | int | → `bet-error { slotIndex, error }` (slot is converted) |
| `error` contains `NO_BOUND_GRANT` or `GRANT_EXPIRED` |  | → `freeround-state: null` + `GetFreerounds` |

Known server exceptions that appear in the `error` string: `BetNotFoundException` (CancelBet on a non-existent bet), `RoundPhaseViolationException` (wrong phase), `NO_BOUND_GRANT`, `GRANT_EXPIRED`. `bet-error` does **not** change the slot's state — `betFailed` is set only on "BetPlaced did not arrive before FLYING".

## REST endpoints

All `fetch` calls — `LaunchService.ts` / `BetRecoveryService.ts`. `apiBaseUrl` = `KrashConfig.apiBaseUrl`.

### Session exchange (LaunchService.ts:192-221)

```
POST {apiBaseUrl}/seamless/session/exchange
Content-Type: application/json

{ "one_shot_token": "<t query param>" }

```

Response (`SessionExchangeResponse`, launch.ts:28-37):
```
{ "result_code": 0, "session_token": "…", "currency": "USD", "game_id": "your_game",
  "mode": "real", "lang": "en", "platform": "desktop", "heartbeat_interval_seconds": 30 }

```

Errors → `Error`: non-2xx (`Session exchange failed (<status>): <body>`), `result_code !== 0`, empty `session_token`. `mode` is a string — `isDemo = mode === 'demo'`; `platform` is normalised with `normalizeRawPlatformForApi`. The token is **not** sent in a header.

### Demo launch (LaunchService.ts:229-281)

```
GET {apiBaseUrl}/seamless/launch/demo?gameId=<gid>&platform=<desktop|mobile>[&lang=<lang>][&currencyCode=<currency>][&userId=<userId>]

```

`gameId` and `platform` are always sent (`resolvePlatformForApi` — URL hint + runtime detection); `lang`, `currencyCode`, `userId` only if present. Response (`DemoLaunchResponse`): `{ result_code, launch_url?, session_id?, message? }`. `result_code !== 0` or a missing `launch_url` → `Error(message)`. `t` (and `gid`) are read from `launch_url` and **the same exchange endpoint** is called. Then: the session is stored, the query parameters of `launch_url` are added to the browser URL, `mode=demo` is added.

### Recovery bets (BetRecoveryService.ts:43-79)

```
GET {apiBaseUrl}/seamless/session/recovery/bets?roundId=<roundId>
X-Game-Session-Token: <sessionToken>

```

The only endpoint that sends the session token in a header. Response — `RecoveryBet[]`:
```
interface RecoveryBet {
  betId: string; slot: number; roundId: string;
  betAmount: { amount: number; currency: string };
  status: string;
  payoutMultiplier: number | null; payoutAmount: number | null; autoCashoutMultiplier: number | null;
}

```

Non-2xx body JSON `{ errorCode, message, currentRoundId? }`; `errorCode === 'ROUND_MISMATCH'` → `RoundMismatchError` (`.currentRoundId`). `fetchRecoveryBets` is exported from `@krash/sdk`, but **the SDK itself never calls it** — after a bet timeout the SDK relies on `RoundMyBets`. Use it only for your own recovery UI.

## Debugging checklist

1. `?debug=1` → in the console `→ <cmd>` / `← <cmd>` on every exchange, `JoinCrashOk keys: [...]`, `[FR] grant keys: [...]`, `[HIST] ticket keys: [...]`. Look at this first, then the Network tab.
1. Network → WS frames are binary (SmartFox protocol) — field names cannot be read there; the three REST calls are plain JSON.
1. "The field does not show up in the SDK" → check the wire type (tables above): `int` instead of `double` = `SFSTypeError` = the field is lost, and without `try/catch` the parser throws away the whole response (on `MyHistory`/`History`/`GetFreeroundHistoryOk` a log arrives, on `BetPlaced`/`CashoutDone` the exception propagates into the `EXTENSION_RESPONSE` handler).
1. `unhandled cmd: X` → the server added a new push; the SDK ignores it.
1. `freeround-state` unexpectedly `null` → look for `Error` `NO_BOUND_GRANT`/`GRANT_EXPIRED` or `UnbindFreeroundOk` in the log.

