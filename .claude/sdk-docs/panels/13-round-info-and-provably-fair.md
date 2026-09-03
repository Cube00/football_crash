<!-- source: https://krash-sdk-docs.playcore.live/en/panels/13-round-info-and-provably-fair/ -->

# 13. Round details and Provably Fair

The round details popup ("Points Details") opens when the user taps a single round in the multiplier-history strip or in the statistics grid. It shows the `roundId`, crash multiplier, date, `fairnessHash` and `serverSeed` with copy buttons, and at the bottom a link "What is Provably Fair" → a static explanation page. The same group includes three static info pages — **How to Play**, **Rules**, **Limits** — which open from the settings menu. On desktop all of these render inside `DesktopInfoPopup` (`InfoPopup` chrome), on mobile — inside `MobilePopup` (`Popup` chrome); both are the reference implementation's own popup containers (17).

## What it shows

**Round info** (`RoundInfoContent`): - Round ID + copy button. - Multiplier in `X.XXx` format. - Date (`DD Mon, YYYY H:mm`) — only if an ISO string exists. - Fairness hash + verified icon + copy (only if `fairnessHash` exists). - Server seed + copy (only if `serverSeed` exists). - "Meaning of Provably Fair" link.

**Provably Fair** (`ProvablyFairContent`): "How it works" info box; "Before round" and "After round" tables (Round # / Server key / Crash point / Hash); a list of 4 parameters; verification formula; example. **The table values are hardcoded samples** (`'1'`, `'tw53L6dObH16xkpI'`, `'2.45x'`, `'065231e9d47f…'`), not the current round's data.

**How to Play** (`HowToPlayContent`): two step lists with images + an example with the currency code.

**Rules** / **Limits** (`InfoSection`): heading + text. In Limits the numbers come from `GameConfig`.

## SDK sources

| Data | Source | Type | Note |
| `roundId`, `crashAt`, `fairnessHash`, `serverSeed`, `startTimeMs` | `game-history` → `GameHistoryItem` | `string / number / string / string / number` | `types/events.ts:232-238`. The wire field names are the same (`SfsProtocol.ts:514-518`) |
| the same, for the just-finished round | `crash-history-item` | `{ roundId, crashAt, fairnessHash?, serverSeed?, timestamp }` | `types/events.ts:317`; `GameEngine.ts:96-100` sends it from the CRASHED tick |
| hash/seed of the CRASHED tick | `tick` → `TickPayload.fairnessHash?`, `serverSeed?` | `string?` | `types/events.ts:26-29` — only arrives in the CRASHED tick; the SDK parses it in `SfsProtocol.ts:108-113` |
| Limits: `maxWinAmount`, `maxBet`, `minBet`, `currencyCode`, `currencyMinorUnits` | `useGameConfig()` (store) or `useGameConfigContext().config` | `GameConfig \| null` / `GameConfig` | `types/betting.ts:91-112`. `GameConfigProvider` holds an empty default until the app calls `updateConfig` — the reference implementation does this in its betting adapter hook |
| currency code in the How-to-Play example | `config?.currencyCode` | `string` | the reference implementation reads it from config here, not from `useCurrency().currency` |

`fairnessHash` and `serverSeed` are **required strings** at the type level in `GameHistoryItem`, but optional in `crash-history-item` and `TickPayload` — in the UI handle both cases as an empty string/undefined.

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Tapping a round (history strip / grid) | reference implementation: `selectRoundItem(item)` → `EventBus.emit('ui:round-selected')` + popup open (`EventBus` — the app's local `Phaser.Events.EventEmitter`) | does not touch the SDK |
| Copy roundId / hash / seed | `navigator.clipboard.writeText(...)`, 2 s "copied" state | does not touch the SDK |
| "Meaning of Provably Fair" | changing the popup type to `PROVABLY_FAIR` | does not touch the SDK |
| Settings → How to Play / Rules / Limits / Provably Fair | `nav.handleInfoPopupClick(InfoPopupTypes.X)` (desktop) / `nav.handleMobileInfoClick(Popups.X)` (mobile) — `nav` is the app's own navigation state | does not touch the SDK |

## States and edge cases

- **`fairnessHash` missing** — the reference implementation hides the whole right block (date on desktop + hash). The date is then not shown on desktop at all.
- **`serverSeed` missing** — the seed card is not rendered.
- **Date** — the reference implementation's `MultiplierGridItem.crashAt` (the UI's own history item type) is an ISO string (from `startTimeMs` or `crash-history-item.timestamp`); if the string contains no `'T'`, the date is not printed.
- **`selectedRoundItem === null`** — the popup type is set, but the content is not rendered.
- **`GameConfig` not arrived yet** — `useGameConfig()` returns `null`; the reference implementation uses `useGameConfigContext().config`, which has default values, so `toFixed` does not crash.
- **Clipboard API** — in an iframe `navigator.clipboard` may not be available; the reference implementation only writes a `logger.error`.
- **Reconnect / frozen / freebet / autoplay** — no effect; the popups show historical data.

## Reference implementation

Building blocks:

- `RoundInfoContent` — round cards, copy handlers, date formatting; props `{ item: MultiplierGridItem, isMobile?, onMeaningOfProvablyFairClick }`.
- `ProvablyFairContent` — section rendering (`InfoBox`, `DataTable` mobile/desktop, bullets, numbering).
- `HowToPlayContent` — step list + image + info box.
- `InfoSection` — heading + `string | string[]` text (Rules, Limits).
- a single `infoContent` module — `getRulesSections(t)`, `getLimitsSections(t, config)`, `getProvablyFairSections(t)`, `getHowToPlaySections(t, currency, img1, img2)` — one source for mobile and desktop.
- `DesktopInfoPopup` — `InfoPopupTypes` → content; **mounted on mobile too**, because the freebet modals live in the same popup.
- `MobilePopup` — `Popups.POINTS_DETAILS / RULES / LIMITS / PROVABLY_FAIR / HOW_TO_PLAY` → the same content in `Popup` chrome.
- the app's own history hook — `selectedRoundItem` state, `ui:round-selected` EventBus event.

The selected round is propagated via the app's local `EventBus`, so that any component can select a round without prop drilling. If you write your own history hook, do not reuse the SDK hook name — `@krash/react`'s `useGameHistory()` returns `{ items, fetch }`, and a same-named local hook makes imports ambiguous. Reference implementation — propagating the round selection inside the history hook:
```
useEffect(() => {
  const handleRoundSelected = (item: MultiplierGridItem | null) => {
    if (!item) { setSelectedRoundItem(null); return; }
    const fullItem = multiplierHistoryRef.current.find(h => h.id === item.id) ?? item;
    setSelectedRoundItem(fullItem);
  };
  EventBus.on('ui:round-selected', handleRoundSelected);
  return () => { EventBus.off('ui:round-selected', handleRoundSelected); };
}, []);

const selectRoundItem = useCallback((item: MultiplierGridItem | null) => {
  EventBus.emit('ui:round-selected', item);
}, []);

```

Reference implementation — Limits sections from `GameConfig`:
```
export const getLimitsSections = (t: TFn, config: GameConfig) => [
  {
    heading: t('limits.maximumWin.heading'),
    content: t('limits.maximumWin.content', {maxWinAmount: config?.maxWinAmount.toFixed(config.currencyMinorUnits),currencyCode: config.currencyCode}),
  },
  { heading: t('limits.minimumCashout.heading'), content: t('limits.minimumCashout.content') },
  {
    heading: t('limits.maximumBet.heading'),
    content: t('limits.maximumBet.content',{maxBet: config?.maxBet.toFixed(config.currencyMinorUnits),currencyCode: config.currencyCode}),
  },
  {
    heading: t('limits.minimumBet.heading'),
    content: t('limits.minimumBet.content',{minBet: config?.minBet.toFixed(config.currencyMinorUnits),currencyCode: config.currencyCode}),
  }
];

```

The "Minimum cashout" text is static — there is no such field in `GameConfig`; the freebet `minCashout` sits separately in `FreeroundState`.

Reference implementation — copy button (`playSound` — the app's sound helper, 14):
```
const handleCopyHash = async () => {
  playSound('smallButtonClick');
  if (item.fairnessHash) {
    try {
      await navigator.clipboard.writeText(item.fairnessHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch (err) {
      logger.error('Failed to copy hash:', err);
    }
  }
};

```

**UI policy (skin responsibility) vs SDK:** the `ui:round-selected` EventBus, the `MultiplierGridItem` type, the double popup chrome, the hardcoded PF table — skin. The SDK only has the data for this panel (`GameHistoryItem`, `crash-history-item`, `GameConfig`); there is no verification logic in the SDK.

## Minimal example (React + Vite)

```
import { useState } from 'react';
import { useGameConfig, useGameHistory } from '@krash/react';
import type { GameHistoryItem } from '@krash/react';

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* iframe / no permission */ }
      }}
    >{done ? 'Copied' : 'Copy'}</button>
  );
}

export function RoundInfo({ item, onClose }: { item: GameHistoryItem; onClose: () => void }) {
  const date = item.startTimeMs ? new Date(item.startTimeMs).toLocaleString() : '';
  return (
    <div role="dialog" aria-modal="true">
      <p>Round ID: {item.roundId} <Copy value={item.roundId} /></p>
      <p>{item.crashAt.toFixed(2)}x {date && <small>{date}</small>}</p>
      {item.fairnessHash && <p>Hash: <code>{item.fairnessHash}</code> <Copy value={item.fairnessHash} /></p>}
      {item.serverSeed && <p>Server seed: <code>{item.serverSeed}</code> <Copy value={item.serverSeed} /></p>}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export function LimitsInfo() {
  const config = useGameConfig(); // GameConfig | null — null until game-config arrives
  if (!config) return <p>Loading limits…</p>;
  const fmt = (n: number) => `${n.toFixed(config.currencyMinorUnits)} ${config.currencyCode}`;
  return (
    <dl>
      <dt>Max win</dt><dd>{fmt(config.maxWinAmount)}</dd>
      <dt>Max bet</dt><dd>{fmt(config.maxBet)}</dd>
      <dt>Min bet</dt><dd>{fmt(config.minBet)}</dd>
    </dl>
  );
}

export function HistoryWithDetails() {
  const { items } = useGameHistory();
  const [selected, setSelected] = useState<GameHistoryItem | null>(null);
  return (
    <>
      <ul>{items.map(i => <li key={i.roundId}><button onClick={() => setSelected(i)}>{i.crashAt.toFixed(2)}x</button></li>)}</ul>
      {selected && <RoundInfo item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

```

## Common mistakes

- **Taking the PF table example as real data** — `getProvablyFairSections` is static; the real hash/seed are only in the round details view.
- **Skipping the `null` case of `useGameConfig()`** — the store config is `null` until the `game-config` event; `toFixed` crashes.
- **`GameConfigProvider`'s "empty" config** — if you use `useGameConfigContext()`, syncing `updateConfig(useGameConfig())` is your job, otherwise you will print the default values.
- **Treating hash/seed as required** — in `crash-history-item` both are optional; render the blocks conditionally.
- **Reading `crashAt` as a date** — in the SDK it is the multiplier; the date is `startTimeMs` (round start) or `timestamp`.

