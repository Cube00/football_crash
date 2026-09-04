<!-- source: https://krash-sdk-docs.playcore.live/en/panels/12-statistics/ -->

# 12. Statistics

The statistics panel shows the crash multipliers of the last N rounds in two views: a **pill grid** (one "pill" per round) and a **chart** (multipliers grouped into ranges, in percentages). Below it a **rounds selector** chooses how many rounds to load (50 / 100 / 200 / 300). In the reference implementation it is one of the right sidebar's contents on desktop (`SidebarArea.Statistics`), on mobile — a full-screen popup (`Popups.STATISTICS`), whose header hosts the tab switcher.

The server **has no separate statistics endpoint** — everything is computed on the client from the `game-history` response.

## What it shows

- Tab switcher: "Statistics" / "Chart" (`StatisticsTab.Statistics | Chart`).
- **Statistics tab** — pill grid, each item = one round's `crashAt` multiplier; tapping opens the round details (13-round-info-and-provably-fair).
- **Chart tab** — 7 ranges and each one's share in percentages: `1x` · `1.01x – 1.99x` · `2x – 5.99x` · `6x – 25.99x` · `26x – 100.99x` · `101x – 4 999.99x` · `5 000x+`.
- Rounds selector: `50 | 100 | 200 | 300`, default `50`.
- Close button (in the desktop sidebar).

## SDK sources

| Data | Source | Type | Note |
| list of rounds | `client.on('game-history', items)` / `useGameHistory().items` (`@krash/react`) | `GameHistoryItem[]` | `{ roundId, crashAt, fairnessHash, serverSeed, startTimeMs }` (`packages/sdk/src/types/events.ts:232-238`). Wire: `crashAt` (double), `fairnessHash`, `serverSeed`, `startTimeMs` (long) — `SfsProtocol.ts:515-518` |
| new round after a crash | `client.on('crash-history-item', item)` | `{ roundId, crashAt, fairnessHash?, serverSeed?, timestamp }` | `GameEngine.ts:96-100` sends it on the CRASHED tick. `@krash/react`'s `useGameHistory` does **not** listen to this event — the list is only updated on `game-history` |
| initial load | the SDK itself | — | on `JoinCrashOk` `sendGetHistory()` with default `limit = 50` (`ConnectionManager.ts:169-171, 438`) |
| re-request | `client.getHistory(limit?)` / `useGameHistory().fetch(limit?)` | `void` | the response arrives asynchronously with the `game-history` event and **replaces** the whole list |
| range percentages | computed on the client | — | neither the SDK nor the server has this |

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Rounds selector (50/100/200/300) | `client.getHistory(limit)` / `fetch(limit)` (in the reference implementation via `EventBus.emit('cmd:get-history', { limit })` through a bridge component) | `GetHistory {limit}` → `GetHistoryOk` → `game-history` event; the store does not change, only the event |
| Switching tabs | local state (`activeTab` / `nav.activePopupTab`) | does not touch the SDK |
| Tapping a pill | `setSelectedRoundItem(item)` + popup open | does not touch the SDK — the data is already in `GameHistoryItem` |

## States and edge cases

- **Empty list** — `items = []` until `JoinCrashOk`. The chart function returns `[]` on an empty list; the reference implementation only draws the chart when `calculatedChartData.length > 0`.
- **CRASHED** — the SDK fires `crash-history-item`. If you use `@krash/react`'s `useGameHistory`, the list will not update until you call `fetch()` (or prepend the `crash-history-item` to the list yourself, as the reference implementation does).
- **Reconnect** — `JoinCrashOk` arrives again → the SDK sends `GetHistory` (50) again → the list is replaced with 50, even if the user had 300 selected. To fix this, re-run the selector's limit on reconnect (`connection-change: 'connected'` → `fetch(limit)`) — keep the selector state and the list in one place so the limit is reachable.
- **Frozen / disconnected** — the panel shows historical data, no blocking is needed.
- **Freebet / autoplay** — no effect.
- **Percent rounding** — `Math.round` per range, the sum may not be 100.

## Reference implementation

The reference implementation: a desktop sidebar wrapper (`TabSwitcher` + close + grid `columns={4}`), a grid/chart component (switch, range computation, `RoundsSelector`), a chart component (bars `width: percentage%`), a rounds selector (4 buttons, `aria-pressed`, keyboard support), a two-option tab switcher (`smallButtonClick` sound), navigation state (`activePopupTab` — the mobile popup header's tab), the mobile popup / desktop sidebar mount and its own history hook (`game-history` + `crash-history-item` → `MultiplierGridItem[]`). In the local `MultiplierGridItem { id, number, fairnessHash?, serverSeed?, roundId?, crashAt? }` type **`crashAt` is an ISO date**, while the SDK's `crashAt` (the multiplier) sits in the `number` field.

Reference implementation — ranges and percentages:
```
const MULTIPLIER_RANGES = [
  { id: '1', range: '1x', min: 1, max: 1 },
  { id: '2', range: '1.01x - 1.99x', min: 1.01, max: 1.99 },
  { id: '3', range: '2x - 5.99x', min: 2, max: 5.99 },
  { id: '4', range: '6x - 25.99x', min: 6, max: 25.99 },
  { id: '5', range: '26x - 100.99x', min: 26, max: 100.99 },
  { id: '6', range: '101x - 4 999.99x', min: 101, max: 4999.99 },
  { id: '7', range: '5 000x', min: 5000, max: Infinity },
];

const calculateChartData = (items: MultiplierGridItem[]): StatisticsChartItem[] => {
  if (items.length === 0) return [];
  const rangeCounts = MULTIPLIER_RANGES.map(range => {
    const count = items.filter(item => {
      const value = typeof item.number === 'string' ? parseFloat(item.number) : item.number;
      return value >= range.min && value <= range.max;
    }).length;
    return { ...range, count };
  });
  const total = items.length;
  return rangeCounts.map(range => ({
    id: range.id,
    range: range.range,
    percentage: total > 0 ? Math.round((range.count / total) * 100) : 0,
  }));
};

```

Reference implementation — the rounds selector and the SDK back-channel (`playSound` — the app's local sound helper; `nav` — the app's own popup/sidebar state; `EventBus` — the app's local `Phaser.Events.EventEmitter`):
```
<RoundsSelector
  selected={selectedRounds}
  options={[50, 100, 200, 300]}
  onChange={(value: number) => {
    setSelectedRounds(value);
    onChangeRoundCount?.(value);
    playSound('smallButtonClick');
  }}
  isMobile={isMobile}
/>

```

```
<Statistic
  items={multiplierHistory}
  onClose={() => nav.handleSidebarAreaClick(null)}
  onChangeRoundCount={value => EventBus.emit('cmd:get-history', { limit: value })}
  onItemClick={handleItemClick}
/>

```

`cmd:get-history` is caught by the bridge component, which calls `client.getHistory(cmd.limit ?? 50)`. This is part of the reference implementation's EventBus architecture — you can call `client.getHistory(limit)` / `fetch(limit)` directly.

The reference implementation's own history hook listens to both events (if you write one, do not reuse the SDK's `useGameHistory` name — `@krash/react`'s `useGameHistory()` returns `{ items, fetch }`, and a same-named local hook makes imports ambiguous):
```
client.on('crash-history-item', (item) => {
  const mapped: MultiplierGridItem = {
    id: item.roundId,
    number: item.crashAt,
    fairnessHash: item.fairnessHash,
    serverSeed: item.serverSeed,
    roundId: item.roundId,
    crashAt: new Date(item.timestamp).toISOString(),
  };
  setMultiplierHistory(prev => [mapped, ...prev]);
}),
client.on('game-history', (items) => {
  setMultiplierHistory(items.map(item => ({ /* ... */
    crashAt: item.startTimeMs ? new Date(item.startTimeMs).toISOString() : '',
  })));
}),

```

**UI policy vs SDK:** the ranges, percentages, `[50,100,200,300]` options, prepending `crash-history-item` to the list, the tabs — all of it is UI policy (skin responsibility). The SDK only has `getHistory(limit)` and the two events.

## Minimal example (React + Vite)

```
import { useEffect, useMemo, useState } from 'react';
import { useGameHistory, useKrashClient } from '@krash/react';
import type { GameHistoryItem } from '@krash/react';

const RANGES = [
  { label: '1x', min: 1, max: 1 },
  { label: '1.01–1.99x', min: 1.01, max: 1.99 },
  { label: '2–5.99x', min: 2, max: 5.99 },
  { label: '6–25.99x', min: 6, max: 25.99 },
  { label: '26–100.99x', min: 26, max: 100.99 },
  { label: '101–4999.99x', min: 101, max: 4999.99 },
  { label: '5000x+', min: 5000, max: Infinity },
];

export function StatisticsPanel() {
  const client = useKrashClient();
  const { items, fetch } = useGameHistory();
  const [limit, setLimit] = useState(50);
  const [tab, setTab] = useState<'grid' | 'chart'>('grid');
  // @krash/react's useGameHistory does not listen to crash-history-item —
  // we re-request after every crash so the list refreshes.
  useEffect(() => client.on('crash-history-item', () => fetch(limit)), [client, fetch, limit]);

  const chart = useMemo(() => {
    const total = items.length;
    return RANGES.map(r => ({
      ...r,
      pct: total ? Math.round((items.filter(i => i.crashAt >= r.min && i.crashAt <= r.max).length / total) * 100) : 0,
    }));
  }, [items]);

  const changeLimit = (n: number) => { setLimit(n); fetch(n); };

  return (
    <section>
      <nav>
        <button onClick={() => setTab('grid')} aria-pressed={tab === 'grid'}>Statistics</button>
        <button onClick={() => setTab('chart')} aria-pressed={tab === 'chart'}>Chart</button>
      </nav>
      {tab === 'grid' ? (
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {items.map((it: GameHistoryItem) => (
            <li key={it.roundId}>{it.crashAt.toFixed(2)}x</li>
          ))}
        </ul>
      ) : (
        <ul>
          {chart.map(r => (
            <li key={r.label}>{r.label} — {r.pct}% <div style={{ width: `${r.pct}%`, height: 6, background: '#c80028' }} /></li>
          ))}
        </ul>
      )}
      <div>
        {[50, 100, 200, 300].map(n => (
          <button key={n} onClick={() => changeLimit(n)} aria-pressed={limit === n}>{n}</button>
        ))}
      </div>
    </section>
  );
}

```

## Common mistakes

- **Ignoring `crash-history-item`** — `@krash/react`'s `useGameHistory().items` is only updated on `game-history`; after a crash the list stays stale until you call `fetch()`.
- **Confusing `crashAt`** — in the SDK `crashAt` is the multiplier (`number`), while the reference implementation's `MultiplierGridItem.crashAt` is an ISO date string. `startTimeMs` is the round's start time, not the crash time.
- **Looking for a statistics endpoint** — there is none; the ranges are computed on the client.
- **The limit after a reconnect** — the SDK requests 50 again; if the user has 300 selected, run `fetch(limit)` again on `connection-change: 'connected'`.
- **Instantiating the history state multiple times** — if you create your own history hook on every mount, each will have its own separate state. Route it through one context or `@krash/react`'s hook.

