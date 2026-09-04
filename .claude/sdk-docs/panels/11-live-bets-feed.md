<!-- source: https://krash-sdk-docs.playcore.live/en/panels/11-live-bets-feed/ -->

# 11. Live bets feed (all players' bets)

The live bets feed is the list of all players' bets in the current round: name, bet, cashout multiplier, win, (in multi-currency mode) currency; below it the counters "cashed out / total" and the sum of wins. In the reference implementation it is the sidebar's default content on desktop (`SidebarArea.BettingHistory`; the component is called `BettingHistory`), on mobile it is the `Popups.MULTIPLIER_HISTORY` popup, and below the betting panels a compact summary (`BettingInfo`) is always visible. The side-menu users button has a badge with the number of players.

## What it shows

- Header: `Player` | `Bet (<currencyCode>)` | `Cashout (<currencyCode>)`; in multi-currency the currency disappears from the header and a separate column is added.
- Row: name (`You` if mine; `username`; otherwise `userId` masked as `1****9`; `Unknown`), bet, after cashout an `x.xx`x badge and payout + `WIN`; after a crash without cashout — "lost" style.
- Sort: my bets → active → cashed out.
- Footer: `<cashedOutCount> / <totalBets>` and the sum of cashed-out payouts.
- Mobile summary (`BettingInfo`): the same two numbers.
- Side-menu badge: the number of list items (**bets**, not unique players).

## SDK sources

| Data | Source | Type | Note |
| bet update | `client.on('bet-update', payload)` | `BetUpdatePayload` | emitted (a) on every `BetUpdateBroadcast` push (`connection/ConnectionManager.ts:474-478`, wire object `bet`), (b) for **each** element of the `RoundBets` response (`ConnectionManager.ts:513-518`) — `GetRoundBets` is sent on `ROOM_JOIN` (`ConnectionManager.ts:347-350`), so on reconnect the list is refilled |
| my username | `client.on('username', { username })` | `{ username: string }` | on login `sfs.mySelf.name`, if it is not `'session_token'` (`ConnectionManager.ts:322-326`) |
| my bet id | `client.on('bet-placed', { betId, … })` | `BetPlacedPayload` | the UI uses this to determine its own `fakeIdentifier` |
| round boundary | `client.on('phase-change', { phase, roundId })` | — | `BETTING_OPEN` → clear the list |
| crash | `client.on('crash', { multiplier })` | — | active rows to "lost" style |
| currency mode | `useIsMultiCurrency()` | `boolean` | store `currencyMode` (`'single' \| 'multi'`, JoinCrashOk) |
| currency format | `useGameConfigContext().config` | — | `currencyMinorUnits`, `currencyCode` |

`BetUpdatePayload` (`packages/sdk/src/types/events.ts:86-100`):
```
/** Another player's bet update (broadcast). */
export interface BetUpdatePayload {
  betId: string;
  amount: number;
  currency: string;
  status: string;
  username: string;
  fakeIdentifier: string;
  userId?: number;
  slot?: number;
  cashedOutAt?: number;
  payout?: number;
  autoCashoutAt?: number;
  roundId?: string;
}

```

Wire fields arrive with the same names in camelCase (`parseBetUpdate`, `connection/SfsProtocol.ts:398-418`): `betId`, `amount`, `currency` (empty → falls back to the game currency), `status` (missing → `'ACTIVE'`), `username` (missing → `''`), `fakeIdentifier`, `userId`, `slot` (the server's 1/2, **not** `BetSlot`), `cashedOutAt`, `payout`, `autoCashoutAt`, `roundId`. The same `betId` arrives several times (placed → cashed out → …), so the UI needs an upsert. The full set of `status` values is not typed in the SDK; the reference implementation only checks `'CANCELLED'` (delete) and `'won'` (win style, together with `payout > 0`).

## Actions → SDK

The panel has no user action — it only reads. The reference implementation re-emits the SDK events on a local `EventBus` (the app's `Phaser.Events.EventEmitter`) through a bridge component:

| SDK event | EventBus |
| `bet-update` | `sfs:bet-update` (and `sfs:bet-update-broadcast`) |
| `bet-placed` | `sfs:bet-placed` |
| `username` | `sfs:my-username` |
| `phase-change` `BETTING_OPEN` | `sfs:betting-history-clear` |
| `crash` | `sfs:crash-state {crashed:true}` → 100 ms → `{crashed:false}` |
| `tick` | `sfs:tick` (`roundId` for the stale filter) |

## States and edge cases

- **`BETTING_OPEN`** — the list is cleared immediately (bypassing the batch), counter 0.
- **`FLYING`** — `bet-update`s arrive with cashouts; upsert by `betId`.
- **`CRASHED`** — `isCrashed` is `true` for 100 ms → rows without a cashout get the "lost" class. `isCrashed` then returns to `false`, but because of the CSS transition the visual remains — this is styling specific to the reference implementation.
- **Stale round** — `payload.roundId` is compared with the `roundId` of the last tick; an update from a different round is ignored. `roundId` is optional — if it does not arrive, the filter does not work.
- **`status === 'CANCELLED'`** — the row is deleted; the SDK has no separate "bet-cancelled" event — a cancel always arrives as a `bet-update`.
- **My bet** — `bet-placed.betId` is stored in `myBetIds`; the `fakeIdentifier` of the matching `bet-update` becomes `myFakeIdentifier`. After a reconnect, if I have not placed a bet in this session, "You" will not appear — `bet-placed` is not emitted for `RoundBets` elements.
- **Reconnect** — `ROOM_JOIN` → `RoundBets` → the list is filled; the `BETTING_OPEN` clear does not happen, so rows of the old round (if any remain) must be filtered out by the stale filter.
- **Batching** — updates are flushed once per 200 ms (~5 renders/s), count listeners with a 150 ms debounce.
- **Multi-currency** — the currency is not written in the header, each row has its own `currency` column; the currency code disappears from the summary.
- **Frozen** — not affected.

## Reference implementation

The reference implementation: a module-level store hook (batching, stale filter, CANCELLED delete, clear, "my bet" detection, hooks built on `useSyncExternalStore` — items, isCrashed, myFakeIdentifier, myUsername, count), a list component (sort, header/footer, multi-currency), a local `BettingHistoryItem` type (a subset of the SDK payload), a row component (display name, win/lost, currency column), a mobile summary (a duplicate of the same sort/count logic), the side-menu badge and a bridge component (SDK → `EventBus`).

### Store + batching (UI policy)

Reference implementation — the module-level store on the `EventBus`:
```
EventBus.on('sfs:bet-update', (payload: BetUpdatePayload) => {
  if (myBetIds.has(payload.betId) && payload.fakeIdentifier) {
    myFakeIdentifier = payload.fakeIdentifier;
    myBetIds.delete(payload.betId);
  }
  if (payload.roundId && currentRoundId && payload.roundId !== currentRoundId) {
    return;                                   // stale round
  }
  const bet: BettingHistoryItem = { betId: payload.betId, amount: payload.amount, /* … */ };
  if (payload.status === 'CANCELLED') {
    pendingUpdates.delete(payload.betId);
    pendingDeletes.add(payload.betId);
    scheduleBatchFlush();
    return;
  }
  pendingDeletes.delete(payload.betId);
  pendingUpdates.set(payload.betId, bet);
  scheduleBatchFlush();                       // 200 ms
});
EventBus.on('sfs:betting-history-clear', () => { setItemsImmediate([]); });

```

### Sort and counters (UI policy)

Reference implementation — the list component's sort and count:
```
for (const item of rawItems) {
  if (myFakeId && item.fakeIdentifier === myFakeId) mine.push(item);
  else if (item.payout !== undefined && item.payout > 0) cashedOut.push(item);
  else active.push(item);
}
const mineCashedOut = mine.filter(item => item.payout !== undefined && item.payout > 0);
const totalCashedOut = cashedOut.length + mineCashedOut.length;
const allItems = [...mine, ...active, ...cashedOut];
const cashedOutCount = totalCashedOut;
const cashedOutWinAmount = [...cashedOut, ...mineCashedOut]
  .reduce((sum, item) => sum + (item.payout ?? 0), 0);

```

Footer: `{cashedOutCount} / {totalBets}` and `formatCurrency(cashedOutWinAmount)`.

### Name and win/lost

Reference implementation — the row's display name and win/lost:
```
const getDisplayName = (): string => {
  if (isMine) return 'You';
  if (username) return username;
  if (userId !== undefined) {
    const userStr = userId.toString();
    if (userStr.length <= 2) return userStr;
    return `${userStr[0]}${'*'.repeat(userStr.length - 2)}${userStr[userStr.length - 1]}`;
  }
  return 'Unknown';
};
const isWin = status === 'won' || (payout !== undefined && payout > 0);
const isLost = isCrashed && !isWin;

```

## Minimal example (React + Vite)

Without the EventBus — directly with `client.on`, `Map` + batching:
```
import { useEffect, useRef, useState } from 'react';
import { useKrashClient, useIsMultiCurrency, GamePhase } from '@krash/react';
import type { BetUpdatePayload } from '@krash/react';

const BATCH_MS = 200;

export function useLiveBets() {
  const client = useKrashClient();
  const [bets, setBets] = useState<BetUpdatePayload[]>([]);
  const mapRef = useRef(new Map<string, BetUpdatePayload>());
  const myIdsRef = useRef(new Set<string>());
  const [myFakeId, setMyFakeId] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => { timer = null; setBets([...mapRef.current.values()]); };
    const schedule = () => { if (timer === null) timer = setTimeout(flush, BATCH_MS); };

    const unsubs = [
      client.on('bet-placed', ({ betId }) => { myIdsRef.current.add(betId); }),
      client.on('bet-update', (p) => {
        if (myIdsRef.current.has(p.betId)) { setMyFakeId(p.fakeIdentifier); myIdsRef.current.delete(p.betId); }
        if (p.status === 'CANCELLED') mapRef.current.delete(p.betId);
        else mapRef.current.set(p.betId, p);
        schedule();
      }),
      client.on('phase-change', ({ phase }) => {
        if (phase === GamePhase.BETTING_OPEN) {
          mapRef.current.clear();
          if (timer !== null) { clearTimeout(timer); timer = null; }
          setBets([]);
        }
      }),
    ];
    return () => { unsubs.forEach(u => u()); if (timer !== null) clearTimeout(timer); };
  }, [client]);

  return { bets, myFakeId };
}

export function LiveBets() {
  const { bets, myFakeId } = useLiveBets();
  const multi = useIsMultiCurrency();
  const sorted = [
    ...bets.filter(b => b.fakeIdentifier === myFakeId),
    ...bets.filter(b => b.fakeIdentifier !== myFakeId && !(b.payout && b.payout > 0)),
    ...bets.filter(b => b.fakeIdentifier !== myFakeId && b.payout && b.payout > 0),
  ];
  const cashedOut = bets.filter(b => b.payout && b.payout > 0);
  return (
    <table>
      <tbody>
        {sorted.map(b => (
          <tr key={b.betId}>
            <td>{b.fakeIdentifier === myFakeId ? 'You' : b.username || b.fakeIdentifier}</td>
            <td>{b.amount.toFixed(2)}{multi ? ` ${b.currency}` : ''}</td>
            <td>{b.cashedOutAt ? `${b.cashedOutAt.toFixed(2)}x` : '-'}</td>
            <td>{b.payout && b.payout > 0 ? b.payout.toFixed(2) : '-'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td>{cashedOut.length} / {bets.length}</td></tr></tfoot>
    </table>
  );
}

```

## Common mistakes

- `setState` on every `bet-update` — hundreds of updates arrive during FLYING; batching (200 ms in the reference implementation) is essential.
- Appending `bet-update`s instead of a Map/upsert — one bet shows up several times (placed, cashed out).
- Not clearing on `phase-change BETTING_OPEN` — the previous round's bets remain in the new one; also add a `roundId` filter in case `RoundBets` brings the old round on reconnect.
- Using `slot` as `BetSlot` — here it is the server's 1/2 (unlike `BetPlacedPayload.slotIndex`, which is 0/1).
- Assuming `username` always exists — it is often `''`; fall back to `userId`/`fakeIdentifier`.
- Describing the players badge as "unique players" — the reference implementation shows `items.length`; for unique use `new Set(items.map(i => i.fakeIdentifier)).size`.
- Expecting `bet-placed` for `RoundBets` elements — after a reconnect the "You" marker is only restored from a new bet.

