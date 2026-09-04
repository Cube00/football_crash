<!-- source: https://krash-sdk-docs.playcore.live/en/panels/04-multiplier-history-strip/ -->

# 04. Multiplier History Strip

A horizontal strip under the header with the crash multipliers of the last rounds (`2.31x`, `1.05x`, …) — newest on the left. The colour of each pill depends on the crash value range. Clicking opens the round details (fairness hash, server seed) — an info popup on desktop, a separate popup on mobile. It is one component on both platforms, with a fixed pill width on mobile (65 px).

## What it shows

- one pill per round: `crashAt.toFixed(2) + 'x'`
- background colour by thresholds: `≤ 2` / `≤ 10` / `≤ 50` / `> 50`
- the list on load — the last 50 rounds (the server's `GetHistory` default limit)
- every new `CRASHED` — the pill is added at the front immediately, without a server round-trip

## SDK sources

| Data | Source | Type | Note |
| initial list | `client.on('game-history')` or `useGameHistory().items` (`@krash/react`) | `GameHistoryItem[]` = `{ roundId, crashAt, fairnessHash, serverSeed, startTimeMs }` | the server's `History` response (`ConnectionManager.ts:501-503`, parse `SfsProtocol.ts:508-520`). The list **fully replaces** the previous one |
| automatic request | SDK `JoinCrashOk` → `sendGetHistory()` | — | `ConnectionManager.ts:438`; default `limit = 50` (`:169`). Again on every (re)connect |
| manual request | `client.getHistory(limit?)` / `useGameHistory().fetch(limit?)` | `void` | `KrashClient.ts:358-360` |
| live crash | `client.on('crash-history-item')` | `{ roundId: string; crashAt: number; fairnessHash?: string; serverSeed?: string; timestamp: number }` | `GameEngine.ts:96-102` — on the transition to `CRASHED`, `fairnessHash`/`serverSeed` from the `CRASHED` tick, `timestamp = Date.now()` (client's) |
| mobile/desktop | `useDevice().isMobile` | `boolean` | pill width and popup type |

### Name collision: `useGameHistory`

|  | `@krash/react` `useGameHistory()` |
| returns | `{ items: GameHistoryItem[]; fetch: (limit?) => void }` (`react/src/hooks/useGameHistory.ts:9-24`) |
| listens to | only `game-history` |
| live prepend | **no** — a new crash appears only on the next `fetch()` |
| cache | no — every instance starts with an empty `[]` and is filled only on the next `game-history` |

If you write your own history hook (list + live prepend + selected item), do **not** reuse the SDK hook's name — a same-named local hook makes imports ambiguous. The reference implementation does use this name for its local hook too (marked `// local hook` in the snippets below); pick a different name in your skin.

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| pill click | reference implementation: `setSelectedRoundItem(item)` → `EventBus.emit('ui:round-selected', item)` → `nav.setActivePopup(Popups.POINTS_DETAILS)` (mobile) / `nav.setInfoPopupType(InfoPopupTypes.POINTS_DETAILS)` (desktop); `EventBus` — the app's local emitter, `nav` — the app's popup state | does not touch the SDK — the data is already in the item (`fairnessHash`, `serverSeed`). Round details — 13-round-info-and-provably-fair |
| changing the count (Statistics panel) | `EventBus.emit('cmd:get-history', { limit })` → `client.getHistory(limit)` | `GetHistory {limit}` → `History` → `game-history` (the list changes in every instance) |

## States and edge cases

- **Before load**: `[]`. `JoinCrashOk` → `GetHistory` → `game-history` arrives automatically; if your component mounts **after** `JoinCrashOk` (e.g. the loader is on `launchStatus` and the strip appears after the loader), you have already missed `game-history` — call `fetch()` on mount.
- **New crash**: `crash-history-item` → prepend. `game-history` replaces — so duplicates disappear by themselves on reconnect.
- **Duplicates**: `crash-history-item` arrives once per `CRASHED` transition. If you do both `fetch()` and prepend at the same time, dedupe by `roundId` (the reference implementation does not do this — it relies on the `game-history` replace).
- **Reconnect in the middle of `CRASHED`**: `crash-history-item` may not arrive (the phase transition did not happen on the client), but this round will already be in the `game-history` from `JoinCrashOk`.
- **`crash-history-item.timestamp`** — the client's `Date.now()`; `game-history`'s `startTimeMs` — the server's. The reference implementation writes both into the `crashAt: string` (ISO) field (see the snippet below), but the semantics differ.
- **Frozen / autoplay / freebet**: not relevant.
- **List size**: the reference implementation does not trim — 50 + every new crash, until the next `game-history` replaces it (reconnect or a Statistics limit change). CSS overflow hides the rest.

## Reference implementation

Structure: - a local history hook — list + live prepend + my-history + selected item - `MultiplierHistory` — the list of pills - `MultiplierPill` — one pill: colour, format, click sound - `GameHeader` — calling the hook, click → popup - the `MultiplierGridItem` type (`id, number, fairnessHash?, serverSeed?, roundId?, crashAt?`)

Reference implementation — the local history hook, SDK events → state:
```
useEffect(() => {
  const unsubs = [
    client.on('crash-history-item', (item) => {
      const mapped: MultiplierGridItem = {
        id: item.roundId,
        number: item.crashAt,
        fairnessHash: item.fairnessHash,
        serverSeed: item.serverSeed,
        roundId: item.roundId,
        crashAt: new Date(item.timestamp).toISOString(),
      };
      setMultiplierHistory(prev => [mapped, ...prev]);      // prepend
    }),
    client.on('game-history', (items) => {
      setMultiplierHistory(items.map(item => ({           // replace
        id: item.roundId,
        number: item.crashAt,
        fairnessHash: item.fairnessHash,
        serverSeed: item.serverSeed,
        roundId: item.roundId,
        crashAt: item.startTimeMs ? new Date(item.startTimeMs).toISOString() : '',
      })));
    }),
    client.on('my-history', (payload) => { … }),
  ];
  return () => unsubs.forEach(u => u());
}, [client]);

```

Colour thresholds and format:
```
const getColorForMultiplier = (value: number): string => {
  if (value <= 2)  return 'rgba(21, 101, 192, 0.80)';
  if (value <= 10) return 'rgba(13, 71, 161, 0.80)';
  if (value <= 50) return 'rgba(106, 27, 154, 0.80)';
  return 'rgba(74, 20, 140, 0.80)';
};
const multiplierValue = normalizeNumber(number);
const backgroundColor = getColorForMultiplier(multiplierValue);
const displayText = `${multiplierValue.toFixed(2)}x`;

```

Click → round details (`nav` — the app's popup state):
```
const { multiplierHistory, setSelectedRoundItem } = useGameHistory();   // local hook, not the @krash/react one

<MultiplierHistory
  items={multiplierHistory}
  onItemClick={i => {
    setSelectedRoundItem(i);   // EventBus.emit('ui:round-selected', i)
    isMobile
      ? nav.setActivePopup(Popups.POINTS_DETAILS)
      : nav.setInfoPopupType(InfoPopupTypes.POINTS_DETAILS);
  }}
/>

```

`setSelectedRoundItem` is an EventBus broadcast, so that every instance (GameHeader, GameContent, popups) sees the same selected item — this is the reference implementation's workaround for the hook having no shared state.

**The SDK does:** `GetHistory` on `JoinCrashOk` (limit 50), `game-history` parsing, `crash-history-item` on every crash with `fairnessHash`/`serverSeed`, `client.getHistory(limit)`. **UI policy (skin responsibility):** the colour thresholds, the prepend/replace strategy, the `MultiplierGridItem` mapping, the `ui:round-selected` broadcast, the click sound (`playSound('buttonClick')` — the app's sound helper), the 65 px mobile width, the `cmd:get-history` EventBus back-channel.

## Minimal example (React + Vite)

`@krash/react`'s `useGameHistory()` + `crash-history-item` prepend, dedupe by `roundId`, `fetch()` on mount (in case `game-history` was already missed).
```
import { useEffect, useState } from 'react';
import { useGameHistory, useKrashClient } from '@krash/react';

interface Pill { roundId: string; crashAt: number; fairnessHash?: string; serverSeed?: string; }

const pillColor = (x: number) =>
  x <= 2 ? '#1565c0' : x <= 10 ? '#0d47a1' : x <= 50 ? '#6a1b9a' : '#4a148c';

export function HistoryStrip({ onSelect }: { onSelect?: (round: Pill) => void }) {
  const client = useKrashClient();
  const { items, fetch } = useGameHistory();     // @krash/react — game-history only
  const [live, setLive] = useState<Pill[]>([]);

  useEffect(() => { fetch(50); }, [fetch]);      // mounted after JoinCrashOk → the list is empty
  useEffect(() => { setLive([]); }, [items]);    // game-history replaces everything

  useEffect(() => client.on('crash-history-item', (it) => {
    setLive(prev => prev.some(p => p.roundId === it.roundId) ? prev : [it, ...prev]);
  }), [client]);

  const pills: Pill[] = [
    ...live,
    ...items.filter(i => !live.some(l => l.roundId === i.roundId)),
  ];

  return (
    <div className="history-strip">
      {pills.slice(0, 40).map(p => (
        <button key={p.roundId} style={{ background: pillColor(p.crashAt) }} onClick={() => onSelect?.(p)}>
          {p.crashAt.toFixed(2)}x
        </button>
      ))}
    </div>
  );
}

```

`fetch()` is safe before the connection — `sendGetHistory` is a no-op without SFS (`ConnectionManager.ts:169-171`); if the component mounts before `JoinCrashOk`, simply two `GetHistory` requests will be sent.

## Common mistakes

- Expecting `@krash/react`'s `useGameHistory` to add the live crash — no, it only listens to `game-history`; you must listen to `crash-history-item` separately.
- Reusing the SDK's name (`useGameHistory`) for your own history hook — imports become ambiguous; the `@krash/react` version returns `{ items, fetch }` and nothing more.
- Calling `client.getHistory()` on `crash-history-item` on every crash — an extra round-trip; prepend is enough, reconnect fixes it on its own.
- Treating `timestamp` (the client's `Date.now()`) as server time — in round details `startTimeMs` is the server's, `timestamp` is not.
- Calling the hook in many places expecting shared state — each instance has its own list; call it once and pass it down via props/context.
- Prepend + fetch without dedupe — one round will appear twice until `game-history` arrives.

