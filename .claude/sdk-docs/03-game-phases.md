<!-- source: https://krash-sdk-docs.playcore.live/en/03-game-phases/ -->

# 3. Game Phases

Round phases, the `tick` payload, the lifecycle of `roundId`/`multiplier`/`crashedAt`, the freeze detector and what `placeBet()` does in each phase. Source — `packages/sdk/src/game/GameEngine.ts`, `game/FreezeDetector.ts`, `betting/BettingEngine.ts:295-360`.

## Cycle

```
BETTING_OPEN → BETTING_CLOSING → FLYING → CRASHED → BETTING_OPEN → ...

```

`GamePhase` enum (`types/enums.ts:8-17`): `'BETTING_OPEN' | 'BETTING_CLOSING' | 'FLYING' | 'CRASHED'`. The **duration of the phases is not written anywhere in the SDK** — the server determines it and sends it in every `tick`'s `remainingMs`. Build the timer in the UI only on `remainingMs`, do not use hardcoded seconds.

## `tick` — the single source

The SDK learns the phase, the multiplier and the round id **only** from the server's `Tick` extension response. `TickPayload` (`types/events.ts:21-30`, parser `SfsProtocol.ts:101-115`):

| Field | Type | Wire | Description |
| `multiplier` | `number` | `multiplier` | current multiplier; also arrives outside FLYING (usually `1`, in CRASHED — the crash value) |
| `phase` | `string` | `phase` | one of the four strings; unknown value → the previous phase stays |
| `roundId` | `string` | `roundId` | `''` when absent |
| `remainingMs` | `number` | `remainingMs` | remaining time of the phase in ms; `0` when absent |
| `fairnessHash?` | `string` | `fairnessHash` | in the CRASHED tick |
| `serverSeed?` | `string` | `serverSeed` | in the CRASHED tick |

Ticks arrive about once every ~100 ms in FLYING; they also arrive in the other phases, but the store's `multiplier` is updated on every tick only in FLYING (`GameEngine.ts:113-118`).

`client.on('tick', ...)` — for Phaser/Canvas; `useMultiplier()` — for React UI. Both are the same data, the difference is only in the re-render path. The reference implementation reads ticks from its own `EventBus` (`EventBus` — the app's local `Phaser.Events.EventEmitter`, to which a bridge component forwards `client.on('tick')`) — that is that app's architecture, the SDK does not need it.

## What happens on a phase change (`GameEngine.handleTick`)

The phase changes only when `tick.phase` differs from the previous one. Sequence (`GameEngine.ts:76-112`):

1. `store.update({ phase, roundId, multiplier })` — in a single update.
1. `emit('phase-change', { phase, roundId })`.
1. If `CRASHED`: `store.crashedAt = tick.multiplier`; `emit('crash', { multiplier })`; `emit('crash-history-item', { roundId, crashAt, fairnessHash, serverSeed, timestamp: Date.now() })`.
1. If `BETTING_OPEN`: `store.crashedAt = null`, `store.multiplier = 1`, `GameEngine.latestMultiplier = 1`.

The `phase-change` listeners (BettingEngine, AutoPlay wiring) run synchronously within a single tick — `store.phase` is already new when `phase-change` arrives.

### `roundId`

- The store's `roundId` is written on **every** phase change with `tick.roundId || previous`.
- `GameEngine`'s internal `currentRoundId` is updated only on `BETTING_OPEN` and `CRASHED` (`GameEngine.ts:80-82`) — i.e. both phases can bring a new id; do not assume the id changes only on BETTING_OPEN.
- `BettingEngine` has its own `roundId` from the `phase-change` payload and writes it to localStorage together with `activeBets` (write-only, see 02).

### `multiplier` and `crashedAt`

| Moment | `store.multiplier` | `store.crashedAt` | `GameEngine.latestMultiplier` |
| BETTING_OPEN | `1` | `null` | `1` |
| BETTING_CLOSING | the tick's value (usually `1`) | `null` | the tick's value |
| FLYING, every tick | `tick.multiplier` | `null` | `tick.multiplier` |
| CRASHED | the crash value (the last phase's tick) | the crash value | the crash value |

`GameEngine.latestMultiplier` — a **static** field, synchronous access to the latest multiplier without the store (`GameEngine.ts:19`). Written on every tick, even without a phase change. The reference implementation exposes it through a `getLatestMultiplier()` helper for autoplay callbacks. Writing it again yourself in a tick handler is redundant — the SDK already does it.

## Phase by phase: what the SDK does and what the UI can do

### `BETTING_OPEN`

SDK (`BettingEngine.onPhaseChange`): - All slot timeouts are cleared; `winAmount/winTimestamp` → `null/0`. - If any slot still has a `Placed`/`Active` bet (the previous round's result did not arrive — a reconnect gap) → `emit('missed-round-bets', { bets })`. - Every slot's `bet = null`, `isSending/isCashingOut/isCancelling/betFailed = false`. - Pending bets are sent (`drainPendingBets`) — `isSending = true`, PlaceBet to the server. - AutoPlay: every slot's `onNewRound()` (stop conditions, round limit, balance, bet).

`placeBet()` → the slot has neither a bet nor a pending one → **sent immediately** (`isSending`, 5000 ms timeout). If the slot already has a bet (Placed) → queued as pending for the next round.

### `BETTING_CLOSING`

SDK: does nothing with bets; the button is `disabled` in every variant (`buttonVariant.ts:66-74`).

`placeBet()` → **does not reject** — the bet is stored as pending and will be sent on the next `BETTING_OPEN`. Nothing is sent to the server in this phase.

### `FLYING`

SDK: - `Placed` → `Active` on every slot. - If a slot has `isSending === true` and `bet === null` (the PlaceBet ACK did not arrive during BETTING_OPEN/CLOSING) → `betFailed = true`, `isSending = false`, after 3000 ms `betFailed` is `false` again. - `store.multiplier` on every tick.

`cashout()` → always sent to the server; `isCashingOut` is set only on an `Active` bet (3000 ms timeout). `placeBet()` → pending. `cancelBet()` on an `Active` bet → `CancelBet` is sent to the server (the server will presumably return `RoundPhaseViolationException` — an `'error'` event); in the UI the button is `Cashout` at this moment, so this does not happen in the normal flow.

### `CRASHED`

SDK: - `store.crashedAt`, `'crash'`, `'crash-history-item'` (above). - `Active`/`Placed` → `Lost`, `isCashingOut = false`. - Finalize of an exhausted freeround grant (see 11-freerounds). - AutoPlay: `onRoundComplete()` — if the rounds are exhausted, it stops immediately with `COMPLETED` (so that the button does not get stuck in `CancelWaiting`).

`placeBet()` → pending. A `Won` bet stays on the slot for display until BETTING_OPEN clears it.

## `crash-history-item`

`GameEngine` emits `{ roundId, crashAt, fairnessHash?, serverSeed?, timestamp }` on every CRASHED. This is generated **locally** from the tick — it does not wait for the server's `History` response. Use it for live appending to the history strip; the initial list comes from `GetHistory` (the `'game-history'` event, `useGameHistory()` from `@krash/react` — returns `{ items, fetch }`). If you write your own history hook that merges `crash-history-item` into the list, do not reuse the SDK hook's name — a same-named local hook makes imports ambiguous.

## Freeze detector

`FreezeDetector` (`game/FreezeDetector.ts`), timeout `FREEZE_TIMEOUT_MS = 2000` (`GameEngine.ts:15`):

- The timer **starts when the first tick arrives** — a freeze between connect and the first tick is not detected, however long it lasts.
- Every tick restarts the timer; 2000 ms without a tick → `isGameFrozen = true`, `emit('game-frozen', { frozen: true })`.
- The next tick → `false` + `{ frozen: false }`.
- `GameEngine.destroy()` (→ `client.destroy()`) stops the timer and, if it was frozen, emits `false`.
- During a reconnect no ticks arrive, so in ~2 seconds `isGameFrozen` becomes `true` — consider it together with `connectionState`.

`computeButtonVariant` returns everything with `disabled: true` when `isFrozen=true` (`Cashout` if the bet is `Active`, otherwise `Bet`) — you don't need to disable the buttons manually, but the overlay/message is yours.
```
import { useIsGameFrozen, useConnectionStatus } from '@krash/react';

function FrozenBanner() {
  const frozen = useIsGameFrozen();
  const { state } = useConnectionStatus();
  if (!frozen) return null;
  return <div>{state === 'connected' ? 'Waiting for server…' : 'Reconnecting…'}</div>;
}

```

## Reading the phase in React

```
import { usePhase, useMultiplier, useCrashedAt, GamePhase } from '@krash/react';

function PhaseDisplay() {
  const phase = usePhase();
  const multiplier = useMultiplier();
  const crashedAt = useCrashedAt();

  switch (phase) {
    case GamePhase.BETTING_OPEN:    return <div>Place your bets</div>;
    case GamePhase.BETTING_CLOSING: return <div>Bets closing…</div>;
    case GamePhase.FLYING:          return <div>{multiplier.toFixed(2)}x</div>;
    case GamePhase.CRASHED:         return <div>Crashed at {(crashedAt ?? multiplier).toFixed(2)}x</div>;
  }
}

```

The `switch` covers all four values, so in `strict` no `default` is needed; if you have `noImplicitReturns`, add `default: return null`.

| Need | Use |
| React UI on the phase | `usePhase()` |
| Phaser/Canvas on a phase change | `client.on('phase-change', ({ phase, roundId }) => ...)` |
| React on every tick | `useMultiplier()` (changes only in FLYING) |
| non-React on every tick, with `remainingMs` | `client.on('tick', ...)` |
| synchronous "what is it now" | `client.store.getSlice('phase')`, `GameEngine.latestMultiplier` |

## Common mistakes

- Hardcoding the phase duration — use `tick.remainingMs`.
- Blocking `placeBet` in `BETTING_CLOSING` "because the server rejects it" — the SDK stores it as pending, blocking is a loss of UX.
- Expecting `roundId` to change only on BETTING_OPEN — it can also change on CRASHED.
- Using `useMultiplier()` in a Phaser scene — this causes a React re-render ~10/s; give the scene `client.on('tick')`.
- A freeze overlay without `connectionState` — it also becomes frozen during a reconnect, the message should be different.

