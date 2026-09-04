<!-- source: https://krash-sdk-docs.playcore.live/en/05-autoplay/ -->

# 5. Auto-play

Auto-play means: the SDK itself places a bet on every `BETTING_OPEN` for N rounds, until the rounds run out or a stop condition fires. The logic lives entirely in `AutoPlayEngine` (`packages/sdk/src/autoplay/AutoPlayEngine.ts`) — each slot has its own engine (`KrashClient.ts:94-97`). In React it is wrapped by `useAutoPlay(slot)`.

In this chapter: the hook's real return, the side effects of `start()`, `AutoPlayConfig`, the engine lifecycle, stop reasons, button variants, server-side auto-cashout, persistence, the relationship with free bets. The UI panel — panels/07 (when it is added).

## useAutoPlay Hook

```
import { useAutoPlay, BetSlot, AutoPlayStopReason } from '@krash/react';

const {
  config,               // AutoPlayConfig — engine.config (the same object, not a copy)
  isActive,             // boolean
  currentRound,         // number — remaining rounds (counts DOWN); === remainingRounds
  totalRounds,          // number — the number passed to start(rounds)
  remainingRounds,      // number — max(0, totalRounds - engine.currentRound)
  roundOptions,         // number[] — [20, 50, 100, 200] (AutoPlayRoundOption)
  start,                // (rounds: number) => void
  startAutoPlay,        // (rounds: number) => void — an identical copy of start
  stop,                 // (reason?: AutoPlayStopReason) => void — default MANUAL_STOP
  updateConfig,         // (partial: Partial<AutoPlayConfig>) => void — shallow merge + persist
  selectRounds,         // (rounds: number) => void — save rounds without starting
  reset,                // () => void — everything to default, except autoCashOut
  onSetStartingBalance, // () => void — no-op (kept for compatibility)
} = useAutoPlay(BetSlot.Slot1);

```

Important details (`packages/react/src/hooks/useAutoPlay.ts`):

- **`currentRound` in the hook and in the engine are different things.** The hook's `currentRound` is `engine.remainingRounds` (counting down: 20, 19, 18…). The engine's `AutoPlayEngine.currentRound` / `AutoPlayState.currentRound` counts **up** — how many bets have been confirmed (0, 1, 2…). If you read `client.getAutoPlay(slot).state` directly, keep this in mind.
- **Re-render** happens: (1) on the `'autoplay-stop'` event for this slot; (2) on every `'phase-change'` while `engine.isActive` (so the counter updates); (3) after the hook's own actions (`forceUpdate`). A re-render does **not** happen if you changed the config of the same engine from another component (e.g. via another `useAutoPlay(slot)` instance or `useBettingSlot`) — all instances read the same engine, but only the hook that invoked the action has the forceUpdate. Manage the config for one slot in one place.
- `config` is a reference to `engine.config`. `updateConfig` creates a new object in the engine (`{...this._config, ...partial}`), so `config.autoCashOut` works safely in `useMemo`/`useEffect` deps.

### `start(rounds)` — what actually happens

`useAutoPlay.ts:41-49`:
```
const start = useCallback((rounds: number) => {
  engine.start(rounds);
  client.notifyAutoPlayChanged();
  const currentPhase = client.store.getSnapshot().phase;
  if (currentPhase === 'BETTING_OPEN') {
    setTimeout(() => engine.onNewRound(), 20);
  }
  forceUpdate((n) => n + 1);
}, [engine, client]);

```

1. `engine.start(rounds)` (`AutoPlayEngine.ts:111-119`): `isActive = true`, `currentRound = 0`, `totalRounds = rounds`, `updateConfig({ rounds })` (persist), `startingBalance = getBalance()` (the wallet balance at this moment — the starting point for the stop limits), `lastWinProfit = 0`.
1. `client.notifyAutoPlayChanged()` → `BettingEngine.forceSyncStore()` — the button variant is recomputed immediately (`CancelWaiting`). The engine's `start()` itself does not touch the store — if you use the engine directly (vanilla), you have to make this call yourself.
1. **If the phase is already `BETTING_OPEN`, the first bet is placed within 20 ms** (`engine.onNewRound()`), without waiting for the next `BETTING_OPEN`. In any other phase the first bet is placed on the next `BETTING_OPEN` (`KrashClient.ts:122-127`).
1. If the slot already has a bet in this round, `onNewRound` → `placeBet` will set it as pending (`BettingEngine.ts:171-180`) — the same rule as for a manual bet.

`startAutoPlay` is exactly the same code — both work identically.

### `stop(reason?)`

`AutoPlayEngine.ts:121-127`: if not active — nothing. Otherwise `isActive = false`, counters = 0, emit `'autoplay-stop' { slot, reason }`. `KrashClient` calls `forceSyncStore()` on this event (`KrashClient.ts:103-105`), so the button variant reverts automatically. **`stop()` does not cancel an already placed or sent bet** — the current round's bet plays out on its own; only subsequent bets will no longer be placed.

### `updateConfig(partial)`

Shallow merge (`AutoPlayEngine.ts:95-98`): `autoCashOut`, `stopOnCashDecrease` and the other nested objects are **replaced entirely**. Always spread:
```
updateConfig({ autoCashOut: { ...config.autoCashOut, enabled: true } });

```

Every `updateConfig` writes to localStorage immediately (see Persistence below).

### `selectRounds(rounds)` and `reset()`

- `selectRounds` — `totalRounds = rounds` + `updateConfig({ rounds })`, autoplay does not start. `useBettingSlot().onStartAutoPlay` uses exactly `config.rounds || engine.totalRounds` and does nothing at 0 — so the UI must call `selectRounds` (or `updateConfig({ rounds })`) first.
- `reset()` (`AutoPlayEngine.ts:129-145`) — `isActive = false`, counters/startingBalance = 0, config to default, **`autoCashOut` stays unchanged**; the result is persisted. `reset()` does **not** emit `'autoplay-stop'` and does not sync the store either — the hook's `reset` only re-renders its own component. `KrashClient.destroy()` calls `reset()` on both engines.

## AutoPlayConfig

`packages/sdk/src/types/betting.ts:116-140`:
```
interface AutoPlayConfig {
  isEnabled: boolean;              // stored, but the engine never reads it — a free field for the UI
  rounds: number;                  // last selected rounds; written by start()/selectRounds()
  autoCashOut: {
    enabled: boolean;
    multiplier: number;            // sent to the server as autoCashoutAt (see below)
  };
  stopOnCashDecrease: { enabled: boolean; amount: number }; // startingBalance - balance >= amount
  stopOnCashIncrease: { enabled: boolean; amount: number }; // balance - startingBalance >= amount
  stopOnSingleWin:    { enabled: boolean; amount: number }; // profit of the last win >= amount
}

```

Defaults (`AutoPlayEngine.ts:15-22`): `isEnabled: false`, `rounds: 0`, `autoCashOut: { enabled: false, multiplier: 2.0 }`, all three stops — `{ enabled: false, amount: 0 }`.

`AutoPlayState` (`engine.state`, `betting.ts:143-149`): `{ isActive, currentRound /* counts up */, totalRounds, startingBalance, config }`.

## AutoPlayEngine lifecycle

The engine has four lifecycle hooks from the outside; all are wired in the `KrashClient` constructor (`KrashClient.ts:107-159`):

| Method | Who calls it | What it does |
| `onNewRound()` | `'phase-change'` → `BETTING_OPEN` (`KrashClient.ts:122-127`); the hook's `start()` within 20 ms | The checks described below, then `onBet(autoCashoutAt)` |
| `onBetConfirmed()` | `'bet-placed'` (`KrashClient.ts:136-139`) | `currentRound += 1` — **a round is counted only on server confirmation**, not on send. A failed bet (`betFailed`) does not consume a round |
| `onWin(profit)` | `'cashout-done'` (`KrashClient.ts:142-159`) | `lastWinProfit = profit`; if `remainingRounds <= 0` — `stop(COMPLETED)` immediately |
| `onRoundComplete()` | `'phase-change'` → `CRASHED` (`KrashClient.ts:128-132`) | If `currentRound >= totalRounds` — `stop(COMPLETED)`, so the button does not stay in `CancelWaiting` during `CRASHED` |

`onNewRound()` sequence (`AutoPlayEngine.ts:166-196`):
```
!isActive                         → return false
checkStopConditions() !== null    → stop(reason)          → false
currentRound >= totalRounds       → stop(COMPLETED)       → false
getBalance() <= 0                 → stop(ERROR)           → false
onBet(autoCashOut.enabled ? autoCashOut.multiplier : undefined) → true

```

`onBet` callback (`KrashClient.ts:110-116`):
```
(autoCashoutAt) => {
  const amount = this.store.getSnapshot().slots[slot].betInputAmount;
  if (amount > 0) {
    this.bettingEngine.placeBet(slot, amount, { autoCashoutAt });
  }
}

```

That is, the autoplay bet amount is **the slot's `betInputAmount`** — whatever is in the input at the moment of `BETTING_OPEN`. If the player changed the input during autoplay, the next bet is placed with the new amount. `amount <= 0` → no bet is placed, but autoplay does not stop.

### Stop conditions — only on BETTING_OPEN

`checkStopConditions()` (`AutoPlayEngine.ts:230-258`) is called **only from `onNewRound()`**, i.e. at the start of the next round. Practical consequences:

- After a big win (`stopOnSingleWin`) autoplay does not stop at the moment of cashout — it stops on the next `BETTING_OPEN`, before placing the bet. `'autoplay-stop'` with `SINGLE_WIN_EXCEEDED` arrives exactly then.
- `lastWinProfit` is reset only on `start()`. If you enabled `stopOnSingleWin` in the middle of autoplay and the previous round's win already exceeds the limit, it will stop on the next `BETTING_OPEN`.
- The balance everywhere is the **wallet balance** (`BettingEngine.currentBalance`, `KrashClient.ts:117`). Freebet bets do not touch the wallet, so `stopOnCashDecrease` practically never fires on freebet, while `stopOnCashIncrease` does fire on wins.
- `ERROR` occurs in only one case: `getBalance() <= 0` at the start of a round. A server rejection of a bet (`'error'`/`'bet-error'`) does **not** stop autoplay — the bet is simply not confirmed and the round is not counted. **Keep in mind:** with a zero wallet balance the player cannot start autoplay even on freebet — the very first `onNewRound` stops with `ERROR`.

### `startingBalance`

`BettingEngine.currentBalance` at the moment of `start()`. `stopOnCashDecrease`/`stopOnCashIncrease` compare the current balance against it. `reset()` zeroes it. The hook's `onSetStartingBalance()` does nothing — the engine takes it itself in `start()`.

### BET_FROM_WIN profit netting

On `'cashout-done'` the profit is computed like this (`KrashClient.ts:144-150`):
```
const profit = payload.betMode === 'BET_FROM_WIN'
  ? payload.payout                      // wire payout is already net (stake × (mult − 1))
  : payload.payout - payload.betAmount; // cash bet + ZERO_BET freebet: payout is gross

```

This `profit` goes to `onWin` and is compared against `stopOnSingleWin`. `betMode` may not arrive on an older backend — then the gross formula applies.

## Stop reasons

`packages/sdk/src/types/enums.ts:68-83`:

| Reason | Who and when | Note |
| `COMPLETED` | `onNewRound` (currentRound >= totalRounds), `onRoundComplete` (CRASHED), `'cashout-done'` (`remainingRounds <= 0`) | The last round was confirmed and finished |
| `CASH_DECREASED` | `checkStopConditions` @ BETTING_OPEN | `startingBalance - balance >= amount` |
| `CASH_INCREASED` | `checkStopConditions` @ BETTING_OPEN | `balance - startingBalance >= amount` |
| `SINGLE_WIN_EXCEEDED` | `checkStopConditions` @ BETTING_OPEN | `lastWinProfit > 0 && lastWinProfit >= amount` |
| `MANUAL_STOP` | `stop()` without an argument — the hook's `stop()`, the UI's `CancelWaiting` click |  |
| `ERROR` | `onNewRound`, `balance <= 0` | **Only** this case. Server errors are not included here |
| `FREEROUND_COMPLETED` | `KrashClient` on `'freeround-completed'` (`KrashClient.ts:171-177`) | The grant ran out — so it does not continue with wallet money |

In every case `'autoplay-stop' { slot, reason }` is emitted (`AutoPlayEngine.ts:126`). `reset()` does not emit.
```
useEffect(() => client.on('autoplay-stop', ({ slot, reason }) => {
  if (reason === AutoPlayStopReason.SINGLE_WIN_EXCEEDED) toast('Auto-play stopped: big win');
  if (reason === AutoPlayStopReason.ERROR) toast('Auto-play stopped: no balance');
}), [client]);

```

## Button variants during autoplay

`BettingEngine` computes the button variant with `computeButtonVariant` and takes the `isAutoPlayActive` flag from `KrashClient.ts:100`. `packages/sdk/src/betting/buttonVariant.ts`:

| Phase | No bet in the slot, autoplay active | Bet in the slot |
| `BETTING_OPEN` | `CancelWaiting`, enabled (`buttonVariant.ts:59-60`) | `Cancel`, enabled (Placed) |
| `BETTING_CLOSING` | `Bet`, disabled — autoplay is not considered here (`buttonVariant.ts:66-73`) | `Cancel`, disabled |
| `FLYING` | `CancelWaiting`, enabled (`buttonVariant.ts:81-82`) | `Cashout`, enabled (Active) |
| `CRASHED` | `CancelWaiting`, enabled (`buttonVariant.ts:93-95`) — also in the Won case | `Lost`, disabled |

The meaning of a click on the `CancelWaiting` button ("stop autoplay / cancel the wait") is not in the SDK — it is a UI decision. In the reference implementation a `Cancel`/`CancelWaiting` click does both: `autoPlay.stop()` + `betting.cancelBet()` (`autoPlay`/`betting` — the returns of `useAutoPlay()`/`useBetting()`; the same in `onStopAutoPlay`) — UI policy (skin responsibility).

The variant is recomputed only on `syncStore`. `engine.start()` is not followed by a store sync — which is why `useAutoPlay().start` and `useBettingSlot().onStartAutoPlay` call `client.notifyAutoPlayChanged()`. `stop()` is followed by a sync via the `'autoplay-stop'` listener.

## Auto-cashout — server-side

`autoCashOut.enabled === true` → `onBet(multiplier)` → `placeBet(slot, amount, { autoCashoutAt })` → `autoCashoutAt` in the `PlaceBet` wire object (`SfsProtocol.ts:56-58`):
```
if (params.autoCashoutAt !== undefined && params.autoCashoutAt > 1.0) {
  obj.putDouble('autoCashoutAt', params.autoCashoutAt);
}

```

- **Sent only when `> 1.0`.** `1.0` or less = no auto-cashout.
- The **server** performs the cashout and sends a regular `CashoutDone` — the client does not compare the multiplier on ticks. For the UI, server-side auto-cashout and manual cashout look identical (`'cashout-done'` → `bet.state = Won`, `winAmount`).
- The same mechanism applies to a manual bet: `useBettingSlot().onBet` passes `autoCashoutAt` according to `autoCashOut.enabled` (`useBettingSlot.ts:80-85`). `useBetting().placeBet(amount, { autoCashoutAt })` — the direct way.
- Changing `autoCashOut.multiplier` in the middle of autoplay takes effect on the next bet, not on an already placed one. `useBettingSlot().autoCashout.canChangeMultiplier` is exactly `!isActive`.

## Persistence

`updateConfig`, `selectRounds`, `start`, `reset` always call `persistence.saveAutoPlayConfig(slot, config)` (`PersistentState.ts:122-126`). Key: `krash.game_state:<username>:<gameId>`, field `autoPlayConfig[slot]`.

- Persistence is bound on the `'username'` event after the SFS login (`KrashClient.ts:203-213`); immediately `engine.hydrate()` (`AutoPlayEngine.ts:153-158`) loads the saved config. **Before that, writing/reading is a no-op** (`PersistentState.storageKey === null`) — an `updateConfig` made during the splash is lost and the value saved after login overwrites it.
- The whole `AutoPlayConfig` is stored (rounds, autoCashOut, stop limits). `isActive`/`currentRound`/`totalRounds` are **not** stored — autoplay does not continue after a refresh.
- `autoCashOut.multiplier` is stored here too — the "autoCashout is not persisted" described in `04-betting` refers to the BettingEngine, not the autoplay config.

## Auto-play and Free Bets

**The SDK does:**

1. The autoplay bet goes to `BettingEngine.placeBet` with `betInputAmount`, where for an active **fixed** grant the amount is replaced with the grant's `betAmount` (`BettingEngine.ts:161-163`). On a **range** grant the SDK changes nothing — the input amount is sent as is, unless the UI processed it.
1. `grantId` is attached to the bet automatically while `freeround.isActive` (`BettingEngine.ts:184-186`).
1. `BetPlaced` with `freeround_completed=true` → `'freeround-completed'` (`BettingEngine.ts:408`) → `KrashClient` stops both active engines with `FREEROUND_COMPLETED` (`KrashClient.ts:171-177`). This happens **as soon as** the last free bet is confirmed, before the round ends — the last bet plays out normally, only the next one will no longer be placed.
1. The SDK does **not** enforce `minCashout` — neither on manual cashout nor on autoplay's `autoCashOut.multiplier`.
1. On an `EXPIRED`/`CANCELLED` summary, `'freeround-completed'` is **not** emitted (only `'freeround-summary'` + `'freeround-state' null`), so the SDK does not stop autoplay — it will continue with wallet money unless the UI stopped it.

**UI policy (skin responsibility)** — the reference implementation does this in its betting adapter hook over the SDK:

- When a freebet is activated, both slots' `autoCashOut.multiplier` is initialised with the grant's `minCashout` and a per-slot override is stored in localStorage, the user's previous value in a separate key (`skin:freebetSavedAutoCashout:slot<N>`); on freebet completion both autoplays stop, `autoCashOut.enabled=false` and the old multiplier is restored. The SDK does not have this.
- The override is reflected in the engine config on every change, because the engine places the bet with `config.autoCashOut.multiplier` and knows no other source.
- On a range grant, the amount clamp `[betMin, betMax]` (for the button variant) and `[betMin, min(betMax, balanceRemaining)]` (when sending the bet).
- Slot 2's autoplay stops automatically when one free bet is left and both slots are on autoplay.

Detailed freebet flow — 11-freerounds.md.

## Example

```
import { useAutoPlay, BetSlot } from '@krash/react';

export function AutoPlayControls({ slot = BetSlot.Slot1 }: { slot?: BetSlot }) {
  const {
    config, isActive, remainingRounds, totalRounds,
    roundOptions, start, stop, updateConfig, selectRounds,
  } = useAutoPlay(slot);

  if (isActive) {
    return (
      <div>
        <span>{totalRounds - remainingRounds} / {totalRounds}</span>
        <button onClick={() => stop()}>Stop</button>
      </div>
    );
  }

  return (
    <div>
      <select
        value={config.rounds || ''}
        onChange={(e) => selectRounds(Number(e.target.value))}
      >
        <option value="" disabled>Rounds</option>
        {roundOptions.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>

      <label>
        <input
          type="checkbox"
          checked={config.autoCashOut.enabled}
          onChange={(e) => updateConfig({
            autoCashOut: { ...config.autoCashOut, enabled: e.target.checked },
          })}
        />
        Auto cashout @
        <input
          type="number" min={1.01} step={0.01}
          value={config.autoCashOut.multiplier}
          onChange={(e) => updateConfig({
            autoCashOut: { ...config.autoCashOut, multiplier: Number(e.target.value) },
          })}
        />
      </label>

      <button disabled={config.rounds <= 0} onClick={() => start(config.rounds)}>
        Start
      </button>
    </div>
  );
}

```

## Common mistakes

- `updateConfig({ autoCashOut: { enabled: true } })` — `multiplier` is lost (shallow merge). Always `...config.autoCashOut`.
- Calling `engine.start()` directly without `notifyAutoPlayChanged()` — the button stays on `Bet` until the next `syncStore`.
- Showing `currentRound` from the hook as the "current round number" — it is the remaining rounds. Current = `totalRounds - remainingRounds`.
- Treating `autoCashOut.multiplier = 1.0` as "auto-cashout" — it is not sent (the `> 1.0` rule).
- Expecting an immediate stop on `stopOnSingleWin` — it stops on the next `BETTING_OPEN`.
- Expecting autoplay to stop by itself on freebet `EXPIRED` — it stops only on `freeround-completed`; on `'freeround-state' === null` the UI must stop it itself (the reference implementation does this).

