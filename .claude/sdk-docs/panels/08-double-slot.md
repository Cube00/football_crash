<!-- source: https://krash-sdk-docs.playcore.live/en/panels/08-double-slot/ -->

# 08. Two bet slots (Double slot)

The game has two independent bet slots (`BetSlot.Slot1`, `BetSlot.Slot2`). On desktop the player chooses whether one (`BetLayout.Single`) or two (`BetLayout.Double`) cards are shown — the second card is closed with "X" and brought back with "+". On mobile the reference implementation always shows both slots and there is no layout switch.

## What it shows

- One or two `BettingPanel`s (each with its own input, quick bets, button, autoplay, auto cashout).
- On the slot 2 card a **close** button (in Double mode) or on the slot 1 card an **add card** button (in Single mode) — both are blocked by the same `isCloseDisabled` condition.
- In freebet the cards' border turns green (`borderColor` prop).

## SDK sources

| Data | Source | Type | Note |
| `layout` | `useBetLayout().layout` | `BetLayout` (`Single` / `Double`) | store slice `betLayout`; default `BetLayout.Double` (`core/KrashStore.ts:42`) |
| persisted layout | `BettingEngine.hydrate()` | — | `saved.betLayout` is restored on the `'username'` event (`betting/BettingEngine.ts:149-151`) |
| slot state | `useBetting(slot).slotState` | `SlotSnapshot` | `subscribeToSlot` — re-render only on this slot's change |
| `hasActiveBets` | `useHasActiveBets()` | `boolean` | `true` if `bet.state` in either slot is `Active` or `Placed` (`betting/BettingEngine.ts:853-856`) |
| autoplay per slot | `useAutoPlay(slot)` | — | a separate `AutoPlayEngine` per slot, separate persisted config |

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Close slot 2 | `setLayout(BetLayout.Single)` | `client.setBetLayout` → `BettingEngine.setBetLayout`: the field changes, `persistence.saveBetLayout`, `syncStore()`. **Slot 2's bet/pending/autoplay stay untouched** — nothing is sent to the server |
| Add card | `setLayout(BetLayout.Double)` | same |

## States and edge cases

- **What blocks closing (UI policy).** The SDK never forbids changing the layout. The reference implementation sets `isCloseDisabled` and the `onClearCardClick` guard if slot 2 has an `Active`/`Placed` bet, `hasPendingBet`, `isSending`, or autoplay is active on **either** slot. Without this the hidden card would place/continue a bet and the player would not see it.
- **Per-slot independence.** `betInputAmount`, `pendingBet`, `bet`, `betFailed`, `buttonVariant`, autoplay config — everything is per-slot. The only shared things: `balance`, `phase`, freeround state, `hasActiveBets`.
- **Freebet.** On a fixed grant `betAmount` is fixed by the server in both slots; the reference implementation's slot 1 / slot 2 lock (the last free bet stays on slot 1) — see 09-freebet.
- **Page refresh.** The layout is restored; pending bets are **not** restored (`hydrate()` reads only `betInputAmounts` + `betLayout`).
- **Mobile.** The reference implementation always renders `[Slot1, Slot2]` with `mode={BetLayout.Double}` and does not read the layout state.

## Reference implementation

In the reference implementation the layout logic lives in three places: the desktop slot mapping, `isCloseDisabled` and the `onClearCardClick` guard (the layout component; on mobile the same component always renders both slots), the close (slot 2, Double) / add (Single) buttons (the betting panel) and passing `useBetLayout()` through the adapter context (`betting.betLayout` / `betting.setBetLayout`).

Reference implementation — the desktop slot mapping and the close-blocking rule (UI policy; `betting` — `useBettingContext()`, the adapter hook over the SDK):
```
{(betting.betLayout === BetLayout.Double
  ? [BetSlot.Slot1, BetSlot.Slot2]
  : [BetSlot.Slot1]
).map((slotIndex: BetSlot) => {
  const ss = betting.getSlotState(slotIndex);
  const s1 = betting.getSlotState(BetSlot.Slot1);
  const s2 = betting.getSlotState(BetSlot.Slot2);
  const isAnyAutoPlayActive = s1.isAutoPlayActive || s2.isAutoPlayActive;
  return (
    <BettingPanel
      ...
      onClearCardClick={() => {
        const hasActiveBet = s2.bet?.state === BetState.Active || s2.bet?.state === BetState.Placed;
        if (hasActiveBet || s2.hasPendingBet || s2.isSending || isAnyAutoPlayActive) return;
        betting.setBetLayout(BetLayout.Single);
      }}
      onAddCardClick={() => betting.setBetLayout(BetLayout.Double)}
      isSingleBet={betting.betLayout === BetLayout.Single}
      isCloseDisabled={isAnyAutoPlayActive || s2.bet?.state === BetState.Active
        || s2.bet?.state === BetState.Placed || s2.hasPendingBet || s2.isSending}
    />
  );
})}

```

The SDK side (`packages/react/src/hooks/useBetLayout.ts:10-15`):
```
export function useBetLayout(): { layout: BetLayout; setLayout: (l: BetLayout) => void } {
  const client = useKrashClient();
  const layout = useStoreSlice(client.store, 'betLayout');
  const setLayout = useCallback((l: BetLayout) => client.setBetLayout(l), [client]);
  return { layout, setLayout };
}

```

## Minimal example (React + Vite)

```
import { useBetLayout, useBetting, useAutoPlay, BetLayout, BetSlot, BetState } from '@krash/react';

export function BetSlots({ renderSlot }: { renderSlot: (slot: BetSlot) => React.ReactNode }) {
  const { layout, setLayout } = useBetLayout();
  const { slotState: s2 } = useBetting(BetSlot.Slot2);
  const ap1 = useAutoPlay(BetSlot.Slot1);
  const ap2 = useAutoPlay(BetSlot.Slot2);

  const slot2Busy =
    s2.bet?.state === BetState.Active ||
    s2.bet?.state === BetState.Placed ||
    s2.hasPendingBet ||
    s2.isSending ||
    ap1.isActive ||
    ap2.isActive;

  const slots = layout === BetLayout.Double ? [BetSlot.Slot1, BetSlot.Slot2] : [BetSlot.Slot1];

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {slots.map(slot => (
        <div key={slot}>
          {renderSlot(slot)}
          {slot === BetSlot.Slot2 && (
            <button disabled={slot2Busy} onClick={() => setLayout(BetLayout.Single)}>×</button>
          )}
        </div>
      ))}
      {layout === BetLayout.Single && (
        <button onClick={() => setLayout(BetLayout.Double)}>+</button>
      )}
    </div>
  );
}

```

## Common mistakes

- Closing slot 2 and expecting the SDK to cancel the bet — `setBetLayout` is only a UI field. Either block closing (the reference implementation's approach), or call `cancelBet()` first.
- Using `useHasActiveBets()` as the close guard — it counts `Active`/`Placed` and **not `hasPendingBet`/`isSending`**; check `slotState` as well.
- Forgetting slot 2's autoplay in Single mode — the engine keeps going until you stop it; block closing on `isAnyAutoPlayActive`.

