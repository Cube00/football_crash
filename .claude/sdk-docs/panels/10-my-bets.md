<!-- source: https://krash-sdk-docs.playcore.live/en/panels/10-my-bets/ -->

# 10. My Bets (my history)

My Bets is the player's own bet history — a list of rounds/tickets with date, bet, win and expandable details (round id, crash multiplier, bet type, multiplier). In the reference implementation it is shown in the sidebar on desktop (`SidebarArea.MyBets`), in a `Popup` on mobile (`Popups.MY_BETS`). The data comes from the server via the `GetMyHistory` request and is returned with the `my-history` event.

## What it shows

- Header "My history".
- Loading spinner → empty list ("No betting history") → rows.
- Each row (collapsed): date `DD MMM, YYYY HH:MM` (months from i18n), `Total bet: <totalBet> <currencyCode>`, on the right `totalWin` (with a minus if < 0) + currency.
- Expanded: `Round ID`, `Crash multiplier` (`crashMultiplier.toFixed(2)x`), `Bet type` (`Classic`/`Free Bet` + `(Slot N)`), `Multiplier` (`bets[0].multiplier.toFixed(2)x`).
- There is **no** pagination UI, although `total/limit/offset` arrive in the payload.

## SDK sources

| Data | Source | Type | Note |
| history | `client.on('my-history', payload)` | `MyHistoryPayload` | `MyHistory` response; there is **no** store slice in the SDK — only the event |
| `useMyBets()` | `@krash/react` | `{ rounds, total, fetch(limit?, offset?) }` | module-level cache — on remount the last data is visible immediately |
| request | `client.getMyHistory(limit?, offset?)` | `void` | `ConnectionManager.sendGetMyHistory(limit = 50, offset = 0)` → `GetMyHistory` |
| automatic request | `ConnectionManager.onRoomJoin` | — | on `ROOM_JOIN` `GetRoundBets` + `GetRoundMyBets` + `GetMyHistory` (`connection/ConnectionManager.ts:347-350`) — the first data arrives without a request, on reconnect too |
| currency | `useGameConfigContext().config.currencyCode` / `useCurrency().currency` | `string` | the reference implementation uses both: totalBet → `currencyCode` + `currencyMinorUnits`, totalWin → `useCurrency` |

`MyHistoryPayload` (`packages/sdk/src/types/events.ts:241-259`):
```
export interface MyHistoryPayload {
  rounds: Array<{
    roundId: string;
    timestamp: string;
    totalBet: number;
    totalWin: number;
    crashMultiplier: number;
    bets: Array<{
      betType: string;      // 'classic' | 'freebet'
      multiplier: number;
      betAmount: number;
      netCash: number;
      slot?: number;
    }>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

```

Wire → SDK normalisation (`connection/SfsProtocol.ts:524-607`): the server returns `rounds[]{roundId, crashMultiplier, tickets[]{betAmount, winAmount, createdAt, slot?, …}}`. The SDK flattens **each ticket into a separate `rounds[]` element**: `roundId = \`${roundId}-ticket-${j}``,`timestamp = ticket.createdAt`,`totalBet = betAmount`,`totalWin = winAmount`,`bets = [{ betType, multiplier: winAmount > 0 ? winAmount / betAmount : 0, betAmount, netCash: winAmount, slot: ticket.slot ?? j + 1 }]`.`betType`is`'freebet'`if the ticket has`freeroundGrantId`/`freeround_grant_id`/`grantId`/`isFreebet`/`betType === 'freebet'`(both spellings), otherwise`'classic'`. Therefore`bets.length`is practically always 1 and the UI shows`bets[0]`.

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Opening the panel | `client.getMyHistory(50, 0)` (in the reference implementation via `EventBus.emit('cmd:get-my-history', { limit: 50, offset: 0 })` through a bridge component; `EventBus` — the app's local emitter) | `GetMyHistory {limit, offset}` → `MyHistory` → `my-history` |
| Refresh (crash / cashout / new round) | same cmd | same |

## States and edge cases

- **Loading.** The SDK has no loading flag — `useMyBets().rounds` starts as an empty array (or with the last data from the cache). If you want a spinner, show it until the first `my-history` arrives, not based on `rounds.length`. Empty `rounds` → "No betting history".
- **Refresh policy (UI policy).** While My Bets is open — on `sfs:crash-state {crashed:true}`, on `sfs:cashout-done` and 1 s after entering `BETTING_OPEN` (so the server has time to record the end of the round). Nothing is sent when closed.
- **Reconnect.** On `ROOM_JOIN` the SDK requests it itself — the list refreshes without a request.
- **`totalWin === 0`** — a lost ticket comes from the server with `winAmount = 0`; a negative `totalWin` practically never occurs. So do not base the win/loss style on `totalWin >= 0` — every row would be green and a loss would never show in red; use `totalWin > 0` (or `bets[0].multiplier > 0`).
- **Freebet ticket** → `betType: 'freebet'` → `t('roundItem.freebet')` = "Free Bet".
- **Frozen / phase** — does not affect the panel.

## Reference implementation

The reference implementation: a list component (loading/empty), a row component (expand, date format, currency), local types (`MyBetRound` — `timestamp: number | string`, `MyBetItem`), its own history hook (`multiplierHistory` + `myBetsData` + `selectedRoundItem`), navigation state (open + refresh policy) and a bridge component (`cmd:get-my-history` → `client.getMyHistory`); mounted in the sidebar on desktop, in a popup on mobile.

### `useGameHistory` and `useMyBets` — do not mix up the names

- **`@krash/react` `useGameHistory()`** — only the list of crash multipliers: `{ items: GameHistoryItem[], fetch(limit?) }`.
- **`@krash/react` `useMyBets()`** — my-history: `{ rounds, total, fetch(limit?, offset?) }` with a module-level cache.
- If you write your own history hook, do not reuse the SDK hook names — a same-named local hook makes imports ambiguous. Also listen to `my-history` in one place (one context, or via the `useMyBets()` cache) — if you create the hook on every mount, each will have its own separate state and they will only agree because they all listen to the same event.

Reference implementation — writing `my-history` into local state (`MyBetRound` — the app's local type):
```
client.on('my-history', (payload) => {
  setMyBetsData({
    rounds: payload.rounds as unknown as MyBetRound[],
    total: payload.total,
    limit: payload.limit,
    offset: payload.offset,
  });
}),

```

Reference implementation — the refresh policy (`EventBus` — the app's local `Phaser.Events.EventEmitter`; the `sfs:*` events are a bridge of the SDK events):
```
const refreshIfMyBets = () => {
  const isMyBetsOpen = isMobile
    ? activePopupRef.current === Popups.MY_BETS
    : sidebarAreaContentRef.current === SidebarArea.MyBets;
  if (isMyBetsOpen) {
    EventBus.emit('cmd:get-my-history', { limit: 50, offset: 0 });
  }
};
const handleCrash = (p: { crashed: boolean }) => { if (p.crashed) refreshIfMyBets(); };
const handleTick = (payload: { phase: string }) => {
  if (payload.phase === 'BETTING_OPEN' && lastPhase !== 'BETTING_OPEN') {
    roundRefreshTimer = setTimeout(refreshIfMyBets, 1000);
  }
  lastPhase = payload.phase;
};
EventBus.on('sfs:crash-state', handleCrash);
EventBus.on('sfs:cashout-done', refreshIfMyBets);
EventBus.on('sfs:tick', handleTick);

```

Reference implementation — date and currency:
```
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const months = t('roundItem.months', { returnObjects: true }) as string[];
  const month = months[date.getMonth()];
  ...
  return `${day} ${month}, ${year}  ${hours}:${minutes}`;
};
// header:
{round.totalBet.toFixed(config?.currencyMinorUnits)} {config?.currencyCode}

```

## Minimal example (React + Vite)

```
import { useEffect } from 'react';
import { useMyBets, useKrashClient, useGameConfigContext, GamePhase } from '@krash/react';

export function MyBets() {
  const { rounds, total, fetch } = useMyBets();
  const client = useKrashClient();
  const { config } = useGameConfigContext();
  const minor = config?.currencyMinorUnits ?? 2;

  useEffect(() => {
    fetch(50, 0);
    return client.on('phase-change', ({ phase }) => {
      if (phase === GamePhase.BETTING_OPEN) {
        setTimeout(() => fetch(50, 0), 1000); // give the server time to record the previous round
      }
    });
  }, [client, fetch]);

  if (rounds.length === 0) return <p>No betting history</p>;

  return (
    <ul>
      {rounds.map(r => {
        const bet = r.bets[0];
        return (
          <li key={r.roundId}>
            <time>{new Date(r.timestamp).toLocaleString()}</time>
            {' · bet '}{r.totalBet.toFixed(minor)}{' · win '}{r.totalWin.toFixed(minor)} {config?.currencyCode}
            {' · '}{r.crashMultiplier.toFixed(2)}x
            {bet && <> · {bet.betType} (slot {bet.slot ?? '?'}) {bet.multiplier.toFixed(2)}x</>}
          </li>
        );
      })}
      <li>total: {total}</li>
    </ul>
  );
}

```

## Common mistakes

- Importing `useGameHistory` from `@krash/react` and expecting my-bets data — it only returns crash multipliers (`{ items, fetch }`); in the SDK my-history lives in `useMyBets()`.
- Treating `bets[]` as all the bets of a round — the SDK flattens tickets into separate "rounds", with a `-ticket-N` suffix on `roundId`; two slots in one real round = two rows.
- Forgetting the automatic `GetMyHistory` on ROOM_JOIN and requesting twice on the first mount — harmless, but redundant.
- Treating `payload.rounds[].timestamp` as a number — it is a string (`createdAt`); `new Date(string)` works, arithmetic does not.
- Refreshing at the moment of `phase-change BETTING_OPEN` — the server may not have recorded the previous round yet; the reference implementation waits 1 s.
- Expecting pagination from the reference implementation — it has no pagination UI; you have to wire up `fetch(limit, offset)` yourself.

