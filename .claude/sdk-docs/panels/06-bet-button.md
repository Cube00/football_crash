<!-- source: https://krash-sdk-docs.playcore.live/en/panels/06-bet-button/ -->

# 06. Bet Button (the main action button)

The main button is one per slot and changes its text, style and action according to phase × bet state: "Bet" → "Cancel" → "Cashout 12.40 USD" → "Lost" and so on. The SDK computes `buttonVariant` + `isButtonDisabled`; the skin must render it and wire up the click. On desktop it is in the centre of the panel (`size='small'`), on mobile — on the right, tall (`size='mobile'`). This chapter — the variant decision table, the reference implementation's overrides and click routing.

## What it shows

- Text by variant (Bet / Cancel / Cashout / Lost / …)
- On `Cashout`: live `betAmount × currentMultiplier` + currency, with a "Cashout" label below
- On `CancelWaiting`: "Cancel" + "waiting for next round"
- `Freebet` (reference visual): "Free bet" text and green style
- disabled state (`betButton--disabled`)
- colour / style — CSS class `betButton--<variant>`

## SDK sources

| Data | Source | Type | Note |
| variant | `useBetting(slot).slotState.buttonVariant` | `BetButtonVariant` | `computeButtonVariant()` (`buttonVariant.ts:24-111`) on every store sync |
| disabled | `slotState.isButtonDisabled` | `boolean` | from the same function |
| bet | `slotState.bet` | `PlayerBet \| null` = `{ id, amount, state, cashedOutAt?, payout?, freeroundGrantId? }` | `bet.amount` for the `Cashout` price |
| input amount | `slotState.betInputAmount` | `number` | in the text / in placeBet on the `Bet` variant |
| multiplier | `useMultiplier()` or `client.on('tick')` | `number` | the live cashout price (see 03) |
| phase | `usePhase()` | `GamePhase` | for the reference `Lost` override |
| autoplay | `useAutoPlay(slot)` → `isActive`, `config.autoCashOut`, `stop()` | — | `autoCashoutAt` and stopping autoplay on cancel |
| freebet | `useFreerounds()` → `state?.minCashout`, `isActive` | `number \| undefined` | the reference cashout gate; `DEFAULT_MIN_CASHOUT = 1.01` (`SfsProtocol.ts:138`) |

### `computeButtonVariant` — the full decision table (SDK)

Preliminary checks in this order (`buttonVariant.ts:31-49`):

| Condition | variant | disabled |
| `isFrozen` | `Active` → `Cashout`, otherwise → `Bet` | `true` |
| `isCashingOut` | `CashingOut` | `true` |
| `isSending` | `Cancel` | `true` |
| `isCancelling` | the variant computed below | `true` (force) |

Phase × state (`:53-103`), the first matching row wins:

| Phase | `betState` / flag | variant | disabled |
| `BETTING_OPEN` | `Placed` | `Cancel` | false |
|  | `hasPendingBet` | `Cancel` | false |
|  | `isAutoPlayActive` | `CancelWaiting` | false |
|  | other (`Idle`/`Won`/`Lost`) | `Bet` | false |
| `BETTING_CLOSING` | `Placed` or `Active` | `Cancel` | **true** |
|  | `hasPendingBet` | `CancelWaiting` | **true** |
|  | other | `Bet` | **true** |
| `FLYING` | `Active` | `Cashout` | false |
|  | `Placed` | `CancelWaiting` | **true** |
|  | `hasPendingBet` or `isAutoPlayActive` | `CancelWaiting` | false |
|  | other | `Bet` | false (`placeBet` → pending) |
| `CRASHED` | `Lost` / `Active` / `Placed` | `Lost` | **true** |
|  | `hasPendingBet` or `isAutoPlayActive` | `CancelWaiting` | false |
|  | other | `Bet` | false (`placeBet` → pending) |

The SDK **never** returns `Sending`, `Cancelling`, `Freebet` (`:44-46, 49, 106-108`) — these enum values are for the skin, if it wants its own mapping.

## Actions → SDK

| variant | click → | SDK / server |
| `Bet` | `placeBet(amount, { autoCashoutAt? })` | `BETTING_OPEN` + empty slot → `PlaceBet` immediately (`isSending`, timeout 5000 ms); in another phase or with the slot occupied → pending queue, sent on the next `BETTING_OPEN` (`BettingEngine.ts:156-181`). Fixed freebet → the SDK overrides the amount (`:161-164`) |
| `Cashout` | `cashout()` | `Active` → `isCashingOut` (timeout 3000 ms) + `Cashout` request (`KrashClient.ts:308-311`) |
| `Cancel` | `cancelBet()` | pending → removed locally, nothing on the server; `Placed`/`Active` → `isCancelling` (3000 ms) + `CancelBet` (`BettingEngine.ts:209-230`, `KrashClient.ts:321-326`) |
| `CancelWaiting` | `cancelBet()` (+ reference: `autoPlay.stop()`) | same; the SDK does **not** stop autoplay — the skin must, otherwise it will bet again on the next round |
| `CashingOut` / `Lost` / disabled | nothing | — |

## States and edge cases

- **Frozen**: every variant is disabled; the reference implementation does nothing extra.
- **`BETTING_CLOSING`**: everything is disabled — you cannot press `Cancel` (to avoid a server phase violation).
- **`FLYING`/`CRASHED` + `Bet` enabled**: click → a pending bet for the next round; the button immediately becomes `CancelWaiting`.
- **Autoplay active, no bet**: `CancelWaiting` enabled → on click the reference implementation stops autoplay **and** calls `cancelBet()` (to clear the pending).
- **Timeouts**: `isSending` clears automatically after 5000 ms, `isCashingOut`/`isCancelling` — after 3000 ms (`BettingEngine.ts:58-60, 268-278`) — the button never gets stuck in disabled forever.
- **Freebet (reference policy)**:
- `Bet` + `isFreeBet` → visual `Freebet`; after placing, the real variant again (Cashout/Cancel)
- `Cashout` + `freeroundState.minCashout` → `CashoutGuardedBetButton`: disabled while `currentMultiplier < minCashout`. **The SDK does not do this** — `cashout()` goes through at any multiplier
- slot lock (freebet exhausted / the last freebet stays on slot 1) → `buttonDisabled = true`, but **not the panel** — the user can change the input
- **`CRASHED` + `Lost` override (reference policy)**: `phase === CRASHED && bet.state ∈ {Active, Placed, Lost} && variant !== Lost` → `Lost`. The SDK returns `Lost` in this case anyway, except for the preliminary checks (e.g. frozen → `Cashout` disabled) — the override is a safeguard.
- **Reconnect**: `round-my-bets` restores `Active`/`Placed`/`CASHED_OUT` with `id: ''` → the variant is computed correctly.
- **Insufficient balance**: the reference implementation intercepts the `Bet` click before the button (chapter 05).

## Reference implementation

Structure: - the betting adapter hook (`useBettingContext()` — the reference implementation's adapter over the SDK) — `buildSlotState`: `effectiveVariant`, `getButtonText`, `panelDisabled`/`buttonDisabled`, `onClick` routing, `minCashoutGate` - `BettingPanel` — `getButtonState` (Freebet mapping, price), `handleBetClick`, `renderBetButton` - `BetButton` — rendering by variant, sounds, keyboard - `CashoutPrice` — `betAmount × currentMultiplier` in an isolated component - `CashoutGuardedBetButton` — the minCashout gate

**Click routing in two layers.** `BettingPanel.handleBetClick`: `Bet` variant → balance check → `onBet(amount)` (the adapter hook's `onBet` — freebet clamp + `placeBet`); every other variant → `buttonState.onClick()` (the adapter hook's `onClick`).

Reference implementation — the adapter hook's `onClick` (`betting` — the result of `useBetting(slot)`, `playSound` — the app's sound helper; trimmed):
```
const onClick = () => {
  if (slotFreebetLocked) return;
  switch (variant) {
    case BetButtonVariant.Bet: {
      if (!isFreeBetActive && effectiveBetAmount > balance) {
        slot1AutoPlay.stop(); slot2AutoPlay.stop(); openCashier(); return;   // skin policy
      }
      const autoCashoutAt = autoPlay.config.autoCashOut.enabled ? displayedMultiplier : undefined;
      betting.placeBet(effectiveBetAmount, { autoCashoutAt });
      playSound('buttonClick');
      break;
    }
    case BetButtonVariant.Cashout:
      betting.cashout(); playSound('cashout'); break;
    case BetButtonVariant.Cancel:
    case BetButtonVariant.CancelWaiting:
      if (autoPlay.isActive) autoPlay.stop();     // the SDK does not do this
      betting.cancelBet(); playSound('betCancelSwitch'); break;
  }
};

```

Overrides and gate (`ss` — the SDK's slot state):
```
const isCrashedWithActiveBet = phase === GamePhase.CRASHED
  && (ss.bet?.state === BetState.Active || ss.bet?.state === BetState.Placed || ss.bet?.state === BetState.Lost)
  && variant !== BetButtonVariant.Lost;
const effectiveVariant = isCrashedWithActiveBet ? BetButtonVariant.Lost : variant;
const panelDisabled = effectiveVariant === BetButtonVariant.Lost ? true : isDisabled;
const buttonDisabled = panelDisabled || slotFreebetLocked;   // lock on the button only
const freebetMinCashout = isFreeBetActive ? freeroundState?.minCashout : undefined;

const buttonState = {
  variant: effectiveVariant,
  text: getButtonText(effectiveVariant, t),
  disabled: buttonDisabled,
  onClick,
  minCashoutGate: effectiveVariant === BetButtonVariant.Cashout ? freebetMinCashout : undefined,
};

```

Freebet visual, price, guarded button:
```
const price = buttonState.variant === BetButtonVariant.Cashout
  ? <CashoutPrice betAmount={currentBetAmount} />
  : buttonState.price;
const isIdleBetState = buttonState.variant === BetButtonVariant.Bet;
return {
  text: isFreeBet && isIdleBetState ? t('betting.freeBet') : buttonState.text,
  variant: isFreeBet && isIdleBetState ? BetButtonVariant.Freebet : buttonState.variant,
  price, disabled: buttonState.disabled, minCashoutGate: buttonState.minCashoutGate,
};
…
return currentButtonState.minCashoutGate !== undefined
  ? <CashoutGuardedBetButton {...commonProps} minCashoutGate={currentButtonState.minCashoutGate} />
  : <BetButton {...commonProps} />;

```

`CashoutPrice` and `CashoutGuardedBetButton` — only these two components re-render on tick, not the panel (`useTick` — the app's hook over `client.on('tick')`, see chapter 03):
```
export const CashoutPrice = React.memo(({ betAmount }: { betAmount: number }) => {
  const { currentMultiplier } = useTick();
  return <>{(betAmount * currentMultiplier).toFixed(2)}</>;
});

export const CashoutGuardedBetButton = ({ minCashoutGate, disabled, ...rest }) => {
  const { currentMultiplier } = useTick();
  const effectiveDisabled = disabled || currentMultiplier < minCashoutGate;
  return <BetButton {...rest} disabled={effectiveDisabled} />;
};

```

Sounds: `Cancel`/`CancelWaiting` → `betCancelSwitch`, otherwise → `buttonClick`. Play the sound in one layer only — if both the button and the adapter hook's `onClick` play it, two sounds go off at once on cashout.

**The SDK does:** the `buttonVariant`/`isButtonDisabled` decision table, timeouts, the `placeBet` pending queue, the local/server branching of `cancelBet`, the fixed-freebet amount override. **UI policy (skin responsibility):** the `Freebet` visual, the `Lost` override, the `minCashout` gate, the freebet slot lock, insufficient balance → cashier, stopping autoplay on cancel, passing `autoCashoutAt` according to the toggle, sounds, isolating `CashoutPrice`.

## Minimal example (React + Vite)

`useBetting` + `useMultiplier`, a switch over every variant. If you use autoplay, also add `useAutoPlay(slot).stop()` on `CancelWaiting`.
```
import { useBetting, useMultiplier, BetSlot, BetButtonVariant } from '@krash/react';

// separate component — only this one re-renders on every tick
function CashoutPrice({ amount }: { amount: number }) {
  const multiplier = useMultiplier();
  return <>{(amount * multiplier).toFixed(2)}</>;
}

export function BetButton({ slot }: { slot: BetSlot }) {
  const { slotState, placeBet, cashout, cancelBet } = useBetting(slot);
  const { buttonVariant: variant, isButtonDisabled, betInputAmount, bet } = slotState;

  let label: React.ReactNode;
  switch (variant) {
    case BetButtonVariant.Bet:           label = `Bet ${betInputAmount.toFixed(2)}`; break;
    case BetButtonVariant.Cashout:       label = <>Cashout <CashoutPrice amount={bet?.amount ?? 0} /></>; break;
    case BetButtonVariant.Cancel:        label = 'Cancel'; break;
    case BetButtonVariant.CancelWaiting: label = 'Cancel (waiting for next round)'; break;
    case BetButtonVariant.CashingOut:    label = 'Cashing out…'; break;
    case BetButtonVariant.Lost:          label = 'Lost'; break;
    case BetButtonVariant.Sending:       // the SDK does not return these — for completeness
    case BetButtonVariant.Cancelling:
    case BetButtonVariant.Freebet:
    default:                             label = 'Bet';
  }

  const onClick = () => {
    switch (variant) {
      case BetButtonVariant.Bet:           placeBet(betInputAmount); break;   // { autoCashoutAt } if auto-cashout is enabled
      case BetButtonVariant.Cashout:       cashout(); break;
      case BetButtonVariant.Cancel:
      case BetButtonVariant.CancelWaiting: cancelBet(); break;                 // + autoPlay.stop() if you use it
    }
  };

  return (
    <button
      className={`bet-btn bet-btn--${variant}`}
      disabled={isButtonDisabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

```

`bet-btn--<variant>` classes: `bet`, `cashout`, `cancel`, `cancel-waiting`, `cashing-out`, `lost` (the enum's string values, `enums.ts:46-65`).

## Common mistakes

- Expecting `Sending`/`Cancelling`/`Freebet` from the SDK — they never arrive; `isSending` = `Cancel` disabled, `isCancelling` = the base variant disabled.
- Only `cancelBet()` on `CancelWaiting` without stopping autoplay — on the next `BETTING_OPEN` autoplay will bet again.
- Computing the `Cashout` price at panel level with `useMultiplier()` — the whole panel re-renders on every tick; isolate it like `CashoutPrice` above.
- Computing the `Cashout` price from the input amount (`betInputAmount`) instead of `slotState.bet.amount` — it only works while the input is locked during a bet; always use `bet.amount`.
- Expecting `minCashout` from the SDK — `cashout()` does no gating; in freebet the UI must hold it back.
- Hiding `Bet` in `FLYING`/`CRASHED` "because a bet can't be placed" — the SDK deliberately leaves it enabled for the pending queue.
- Computing `disabled` by hand from `phase`/`bet.state` — `isButtonDisabled` already includes timeouts/frozen/sending; a manual version will inevitably drift.
- Spreading `isButtonDisabled` over the whole panel including the freebet slot lock — apply the lock only to the button so the input stays editable.

