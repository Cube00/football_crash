<!-- source: https://krash-sdk-docs.playcore.live/en/08-store/ -->

# 8. Reactive Store

`KrashStore` (`packages/sdk/src/core/KrashStore.ts`) — the single store of the game state. The SDK's engines write to it with `update()`, hooks and vanilla code only read and subscribe. This chapter describes `GameSnapshot` field by field (type, default, who writes, when it is reset), the subscription API and the change-detection rule.

## `GameSnapshot` — field by field

Type — `types/game.ts:15-59`; defaults — `KrashStore.ts:23-57`.

| Field | Type | Default | Who writes | When it changes / is reset |
| `phase` | `GamePhase` | `BETTING_OPEN` | `GameEngine` | on every phase change (from the tick). Never "reset" — the default is shown before connect |
| `balance` | `number` | `0` | `BettingEngine.syncStore` | the `'balance'` event (`JoinCrashOk`, `Balance` keep-alive ~5 s, the `balance` of `BetPlaced`/`CashoutDone`/`CancelBetOk`) |
| `multiplier` | `number` | `1` | `GameEngine` | the tick's value on a phase change; on every tick in FLYING; on BETTING_OPEN → `1` |
| `roundId` | `string` | `''` | `GameEngine` | on every phase change `tick.roundId \|\| previous` |
| `crashedAt` | `number \| null` | `null` | `GameEngine` | CRASHED → crash multiplier; BETTING_OPEN → `null` |
| `winAmount` | `number \| null` | `null` | `BettingEngine` | `CashoutDone` → `payout`; BETTING_OPEN and `clearWin()` → `null`. Shared by both slots |
| `winTimestamp` | `number` | `0` | `BettingEngine` | `CashoutDone` → `Date.now()`; BETTING_OPEN and `clearWin()` → `0` |
| `betLayout` | `BetLayout` | `Double` | `BettingEngine` | `setBetLayout()`; from localStorage on hydrate |
| `hasActiveBets` | `boolean` | `false` | `BettingEngine.syncStore` | `true` if any slot has a `Placed`/`Active` bet (pending does not count) |
| `isGameFrozen` | `boolean` | `false` | `GameEngine` (FreezeDetector) | 2000 ms without a tick → `true`; the next tick → `false`; `destroy()` → `false` |
| `connectionState` | `'connected' \| 'disconnected' \| 'checking'` | `'disconnected'` | `KrashClient` (`'connection-change'`) | CONNECTION → `connected`; LOGIN → `checking`; JoinCrashOk → `connected`; CONNECTION_LOST/reconnect attempt → `disconnected` |
| `gameConfig` | `GameConfig \| null` | `null` | `KrashClient` (`onGameConfig`) | the `GameConfig` response on every LOGIN. Never reset — during a reconnect the old one remains, then it is overwritten |
| `currencyMode` | `'single' \| 'multi'` | `'single'` | `KrashClient` (`'currency-mode'`) | on every `JoinCrashOk` |
| `slots` | `Record<BetSlot, SlotSnapshot>` | both: `{ bet: null, betInputAmount: 5, hasPendingBet: false, betFailed: false, buttonVariant: Bet, isButtonDisabled: false, isSending: false }` | `BettingEngine.syncStore` | on every sync **both** slot objects are recreated. `bet` is set to `null` on BETTING_OPEN; `betInputAmount` changes only via `setBetInputAmount`/hydrate |
| `freeround` | `FreeroundState \| null` | `null` | `BettingEngine.syncStore` | `'freeround-state'` (`JoinCrashOk`, `BindFreeroundOk`, `UnbindFreeroundOk`, stale-grant `Error`), bet progress, cancel restore, finalize → `null` |
| `freeroundGrants` | `FreeroundGrant[]` | `[]` | `BettingEngine` | `'freeround-list'` (`JoinCrashOk`'s `GetFreerounds`, `client.getFreerounds()`, stale-grant `Error`); local mirror on bet/cancel; removal of the exhausted grant on finalize |
| `freeroundHistory` | `FreeroundHistoryEntry[]` | `[]` | `BettingEngine` | `'freeround-history'` (`client.getFreeroundHistory()`); the last page, does not accumulate |
| `lastFreeroundSummary` | `FreeroundSummaryPayload \| null` | `null` | `BettingEngine` | `FreeroundCompleted` push (with deferred rules — 11); `acknowledgeFreeroundSummary()` → `null` |

`store.reset()` exists, but **the SDK never calls it** — on reconnect, on `destroy()`, on demo relaunch the store remains unchanged. So after a reconnect the old `slots[].bet`, `balance`, `gameConfig` are visible until the server brings new ones (09).

## Read API

```
client.store.getSnapshot();          // GameSnapshot — the same reference until something changes
client.store.getSlice('balance');    // GameSnapshot['balance']
client.store.getSlice('slots')[BetSlot.Slot1];

```

`getSnapshot`/`getSlice` are arrow properties — they can be passed directly to `useSyncExternalStore`, no `bind` needed.

## Subscription API

| Method | Signature | When it is called | Note |
| `subscribe` | `(listener: () => void) => () => void` | any change (and `reset()`) | global — frequent; `useKrashGame()` uses it |
| `subscribeToKey` | `(key: keyof GameSnapshot, listener) => () => void` | only a change of this key | `useBalance`, `usePhase`, `useMultiplier` etc. (the `useStoreSlice` helper) |
| `subscribeToSlot` | `(slot: BetSlot, listener) => () => void` | this slot's `SlotSnapshot` object changed | `useBetting`, `useBettingSlot` |

All return an unsubscribe function. The listener receives no payload — read afterwards with `getSlice`/`getSnapshot`.

## `update(partial)` — the change-detection rule

`KrashStore.ts:83-126`. Engines call `store.update({ ... })` with a partial object:

1. For every key in the partial:
1. `slots` → each slot (`Slot1`, `Slot2`) is compared with the previous one by **reference** (`!==`); the changed ones go into `changedSlots`. The `'slots'` key itself is **always** added to `changedKeys` if it is in the partial.
1. other keys → `Object.is(old, new)`; different → `changedKeys`.
1. If neither `changedKeys` nor `changedSlots` → **nothing** (the snapshot reference is unchanged, listeners are not called).
1. Otherwise: `snapshot = { ...snapshot, ...partial }` (a new object) → all global listeners → the listeners of every changed key → the listeners of every changed slot.

Practical consequences: - Primitive fields (`balance`, `phase`, `multiplier`) with the same value do **not** trigger anything — outside FLYING `useMultiplier()` does not render. - Object/array fields (`freeroundGrants`, `gameConfig`, `freeround`) are compared by reference — a new object from an engine is always a "change", even if the contents are the same. - `BettingEngine.syncStore()` always rebuilds both slots (`computeSlotSnapshot`), so every sync = both slots' listeners + global. A sync happens on every `balance`, `phase-change`, `bet-placed`, `cashout-done`, `cancel-bet-ok`, `round-my-bets`, `freeround-*` event, on `setBetInputAmount`/`setBetLayout`/`clearWin`, on timeouts and on `notifyAutoPlayChanged()`. - `hasActiveBets`, `winAmount` etc. arrive in the same sync, but key listeners are called only on a real change.

## In React

All hooks use `useSyncExternalStore`:
```
// packages/react/src/internal/useStoreSlice.ts
useSyncExternalStore(
  (cb) => store.subscribeToKey(key, cb),
  () => store.getSlice(key),
  () => store.getSlice(key),   // server snapshot — the same
);

```

`useSyncExternalStore` compares the result of `getSnapshot` with `Object.is` — so the hook must return a **stable reference**. The store guarantees this for primitives and unchanged objects; if in your own hook you combine several fields into one object, use the `useWinDisplay` pattern (`packages/react/src/hooks/useWinDisplay.ts` — a `useRef` cache, a new object only on change), otherwise you will get an infinite loop.

| Hook | Slice | subscription |
| `useKrashGame()` | full snapshot | `subscribe` |
| `useBalance`, `usePhase`, `useMultiplier`, `useCrashedAt`, `useBetLayout`, `useIsGameFrozen`, `useHasActiveBets`, `useGameConfig`, `useCurrencyMode`, `useConnectionStatus` | one key | `subscribeToKey` |
| `useWinDisplay` | `winAmount` + `winTimestamp` | two `subscribeToKey` |
| `useFreerounds` | four freeround keys | four `subscribeToKey` |
| `useBetting`, `useBettingSlot` | `slots[slot]` | `subscribeToSlot` |

## In Vanilla JS

```
import { KrashClient, BetSlot } from '@krash/sdk';

declare const client: KrashClient;

const unsubBalance = client.store.subscribeToKey('balance', () => {
  renderBalance(client.store.getSlice('balance'));
});

const unsubSlot = client.store.subscribeToSlot(BetSlot.Slot1, () => {
  const s = client.store.getSlice('slots')[BetSlot.Slot1];
  renderButton(s.buttonVariant, s.isButtonDisabled, s.betInputAmount);
});

const unsubAll = client.store.subscribe(() => {
  // frequent — only for debug/devtools
});

function teardown() {
  unsubBalance();
  unsubSlot();
  unsubAll();
}

declare function renderBalance(b: number): void;
declare function renderButton(variant: string, disabled: boolean, amount: number): void;

```

## `update` / `reset` — you don't use them

`store.update()` and `store.reset()` are public methods (not hidden in TypeScript), but calling them in production code causes a desync with the engines' internal state — `BettingEngine` will overwrite your change on the next `syncStore`. Use `client.placeBet()`, `client.setBetInputAmount()`, `client.bindFreeround()` etc. The only legitimate exception — **tests**, where you fill the store manually without a launch (09 — Testing).

## Performance

- `useBalance()` (one key) is much cheaper than `useKrashGame()` (a render on every change).
- In FLYING `useMultiplier()` renders ~10/s — this is normal if it only affects the multiplier component. Give Phaser/Canvas `client.on('tick')`, not the hook.
- Take `useBetting` in a single panel component — every sync triggers all subscribers.
- `client.store.getSnapshot()` synchronously, in an event handler — it is free, `useSyncExternalStore` is not needed.

