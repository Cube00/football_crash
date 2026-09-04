<!-- source: https://krash-sdk-docs.playcore.live/en/panels/05-betting-panel/ -->

# 05. Betting Panel (amount input and controls)

The betting panel is a single-slot block: the amount input with `−`/`+` buttons, quick-bet buttons (server-driven `speedButtons` or hardcoded), `Max`, `×2` (`multiplyButton`), the autoplay trigger and the main action button. On desktop two panels side by side (`BetLayout.Double`) or one (`Single`) with add/close card buttons; on mobile **always two** slots stacked vertically, without quick bets and with a custom numeric keyboard. The main button is a separate chapter — 06-bet-button.

## What it shows

- Amount input: `betInputAmount.toFixed(2)`; in freebet an `X/Y` badge and `−`/`+` hidden
- `−` / `+` — by `betStep`, within `[minBet, maxBet]`
- Quick bets (desktop): `speedButtons` (`title`/`value`) or `[2, 5, 10, 50]`, with `Max` last
- `×N`: `multiplyButton.title` or the "2x" icon
- Insufficient balance banner (3 s) / bet failed banner (SDK `betFailed`, 3 s)
- Freebet icon (`isFreeBet`)
- Close card on Slot 2 (desktop, Double), add card on Slot 1 (desktop, Single)
- Autoplay trigger + counter + green dot (auto-cashout enabled) — 05-autoplay

## SDK sources

| Data | Source | Type | Note |
| input amount | `useBetting(slot).slotState.betInputAmount` | `number` | default `5` (`BettingEngine.ts:30`); persisted in `krash.game_state:<username>:<gameId>`, hydrated on the `'username'` event (`:140-153`). **The SDK does not check min/max** — `setBetInputAmount` writes directly (`:253-260`) |
| button variant / disabled | `slotState.buttonVariant`, `slotState.isButtonDisabled` | `BetButtonVariant`, `boolean` | the basis for the panel's disabled |
| bet failed | `slotState.betFailed` | `boolean` | `isSending` and no bet when `FLYING` arrives → `true`, auto-clear 3000 ms (`BettingEngine.ts:334-341`). The server's `bet-error` event is **not** part of this |
| pending / sending | `slotState.hasPendingBet`, `slotState.isSending` | `boolean` | for blocking the close card |
| balance | `useBalance()` | `number` | Max, ×2, insufficient check |
| min/max | `useGameConfig()?.minBet / maxBet` | `number` | default `1`/`1000` until the config arrives |
| step | `useGameConfig()?.clientConfig?.betStep` | `number \| undefined` | `1` when absent |
| quick bets | `clientConfig?.speedButtons` | `ClientConfigButton[]` = `{ key, title, value }` | `title` is only a label, the logic is on `value` (`betting.ts:59-66`) |
| multiply | `clientConfig?.multiplyButton` | `ClientConfigButton` | factor = `value`, default `2` |
| default bet | `clientConfig?.defaultBet` + `gameConfig.configUpdatedAt` | `number`, `number` | the reference implementation applies it once per `configUpdatedAt` (see the snippet below) |
| layout | `useBetLayout()` → `{ layout, setLayout }` | `BetLayout` | default `Double`, persisted (`BettingEngine.ts:240-244`) |
| freebet | `useFreerounds()` → `{ isActive, state }` | `FreeroundState \| null` | `kind: 'fixed' \| 'range'`, `betAmount`, `betMin`, `betMax`, `balanceRemaining`, `balanceInitial` |
| autoplay active | `useAutoPlay(slot).isActive` | `boolean` | input lock |

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| input blur / `−` / `+` / quick bet / Max / ×N / keyboard OK | `setBetAmount(amount)` → `client.setBetInputAmount(slot, amount)` | `slots[slot].betInputAmount` + persistence. Nothing on the server. Autoplay places the next bet with **this** value (`KrashClient.ts:112-115`) |
| keyboard BET (mobile) | `onConfirmBet(amount)` → panel `handleBetClick(amount)` | the normal bet flow (chapter 06) |
| add card | `setLayout(BetLayout.Double)` | `betLayout` + persistence |
| close card | `setLayout(BetLayout.Single)` | same; the reference implementation blocks it up front (see below) |
| insufficient balance | reference implementation: `onStopAutoPlay()` + `openCashier()` + banner | does not touch the SDK (`postMessage('openCashier')`) |

## States and edge cases

**Disabled logic** (reference implementation):
```
hasBetInProgress = buttonState.variant !== Bet
isInputDisabled  = disabled || isAutoPlayActive || hasBetInProgress

```
 where `disabled` = `panelDisabled` = `true` on the `Lost` variant, otherwise the SDK's `isButtonDisabled`. I.e. the input, quick bets and ×N are locked: in `BETTING_CLOSING` (`Bet` disabled), when a bet is placed/pending/being sent, when autoplay is active, frozen, `Lost`.

**Clamp** — the SDK does not do it, it is the UI's responsibility: - on input blur `Math.max(min, Math.min(max, value))`, 2 decimals, empty/NaN → `minValue` - `−`/`+`: `max(min, v − step)` / `min(max, v + step)`; the button is disabled at the boundary - keyboard: `parseKeyboardValue` clamp

**Quick bet (reference policy)**: - the same button twice → **additive**: `current + amount` (`lastQuickBetAmount` tracking); a different button → `amount` - `≥ maxBet` → `maxBet`; `> balance && balance > 0` → `balance`; finally `max(minBet, …)` - a manual change of the input clears `lastQuickBetAmount`

**Max** — `max(minBet, min(maxBet, balance))`. With a `0` balance the result is `minBet`; do not use a falsy check (`balance ? … : maxBet`) (see Common mistakes).

**×N** — `max(minBet, min(current × factor, balance, maxBet))`; both the minBet floor and the balance cap are needed, including for `balance === 0` (see Common mistakes).

**clientConfig apply-once**: `defaultBet` (and `defaultAutoCashout`) is applied once per `configUpdatedAt` — a repeated `game-config` with the same `configUpdatedAt` (reconnect) no longer touches the user's change. If you keep the revision only in an in-memory ref, `defaultBet` overwrites the persisted `betInputAmount` on every page load, because `'username'`→hydrate happens before the `GAME_CONFIG` response — persist the revision too if you want the persisted value to survive.

**Freebet** (reference policy, the SDK only overrides fixed in `BettingEngine.ts:161-164`): | | fixed | range | |---|---|---| | input | locked, `betInputAmount` = `freeroundState.betAmount`, `onBetAmountChange` no-op | editable, `[betMin, betMax]`, displayed = clamp | | `−`/`+` | hidden (`!isFreeBet`) | hidden (same condition) | | quick bets | hidden (`!isFreeBet`) | hidden | | ×N | disabled (`freebetInputLocked`) | enabled | | amount on bet | `betAmount` | `max(betMin, min(betMax, balanceRemaining, amount))`, written back to the input | | X/Y badge | `floor(balanceRemaining / betAmount)` / `floor(balanceInitial / betAmount)` | `balanceRemaining` / `balanceInitial` | | wallet check | skipped (`handleBetClick` `!isFreeBet`) | skipped |

**Insufficient balance** (reference policy): `Bet` variant + `balance < amount` → `onStopAutoPlay()`, `openCashier()`, banner for 3000 ms or until `balance >= amount`. The desktop banner is in the same place as `betFailed` (insufficient takes priority); mobile — separate, while `betFailed` is shown once above both slots.

**Add / close card** (desktop only): - slots = `betLayout === Double ? [Slot1, Slot2] : [Slot1]` - close (slot 2, `!isSingleBet`) is **blocked** if slot 2 has an `Active`/`Placed` bet, `hasPendingBet`, `isSending`, or autoplay is active on **either** slot - add (slot 1, `isSingleBet`) → `setBetLayout(Double)`; `disabled={isCloseDisabled}` applies to it too - mobile: `mode={BetLayout.Double}` always, add/close are not rendered

**Mobile keyboard**: input `readOnly` + `inputMode='none'`, click → portal keyboard; digits, `.`, backspace, 2 decimals, leading zero guard; `OK` → clamp + `setBetAmount`; `BET` → same + `onConfirmBet(amount)` → `handleBetClick(amount)`. Quick bets are **not rendered** on mobile — they only appear in `Single` mode, and on mobile the mode is always Double.

**Reconnect**: `round-my-bets` restores the slots (`BettingEngine.ts:752-782`) → variant `Cancel`/`Cashout` → panel lock. `betInputAmount` does not change on reconnect.

**Frozen**: SDK `isButtonDisabled=true` → `isInputDisabled`. The reference implementation does nothing extra.

## Reference implementation

Structure: - `BettingEngine` — context wrapper for the betting adapter hook; `useBettingContext()` — the reference implementation's adapter hook over the SDK - the adapter hook — SDK → the skin's `SlotState`: `effectiveBetAmount`, `onBet`, `onBetAmountChange`, clientConfig apply, freebet clamp/lock - `GameContent` — slot rendering, add/close conditions, mobile `betFailed` - `BettingPanel` — quick bets, Max, ×N, banners, add/close buttons, keyboard confirm - `PlaceBet` — input, `−`/`+`, clamp, mobile keyboard - `CustomKeyboard` — portal keyboard - `MoneyButton` — quick-bet button (`toFixed(2)` or `displayText`) - `PaceBetAction` — icon button (autoplay, ×N) with counter/green dot

Reference implementation — clientConfig apply-once (in the adapter hook; `slot1AutoPlay`/`slot2AutoPlay` — the result of `useAutoPlay(slot)`):
```
const appliedConfigRevisionRef = useRef<number | undefined>(undefined);
useEffect(() => {
  if (!clientConfig) return;
  const revision = sdkGameConfig?.configUpdatedAt;
  if (revision !== undefined && appliedConfigRevisionRef.current === revision) return;
  appliedConfigRevisionRef.current = revision;

  client.setBetInputAmount(BetSlot.Slot1, clientConfig.defaultBet);
  client.setBetInputAmount(BetSlot.Slot2, clientConfig.defaultBet);

  slot1AutoPlay.updateConfig({ autoCashOut: { ...slot1AutoPlay.config.autoCashOut, multiplier: clientConfig.defaultAutoCashout } });
  slot2AutoPlay.updateConfig({ autoCashOut: { ...slot2AutoPlay.config.autoCashOut, multiplier: clientConfig.defaultAutoCashout } });
}, [clientConfig, sdkGameConfig?.configUpdatedAt]);

```

The quick-bet list (server presets → fallback):
```
const quickBetItems = React.useMemo(() => {
  if (quickBetPresets && quickBetPresets.length > 0) {
    const presets = quickBetPresets.map(p => ({ key: p.key, amount: p.value, displayText: p.title, isMax: false }));
    return [...presets, { key: 'max', amount: 0, displayText: undefined, isMax: true }];
  }
  return quickBetAmounts.map((amount, index) => ({
    key: index === quickBetAmounts.length - 1 ? 'max' : String(amount),
    amount, displayText: undefined,
    isMax: index === quickBetAmounts.length - 1,   // last of the hardcoded list = Max
  }));
}, [quickBetPresets, quickBetAmounts]);

```

Reference implementation — additive quick-bet logic (trimmed):
```
const handleQuickBet = useCallback((amount: number) => {
  const isSameButton = lastQuickBetAmount === amount;
  const newAmount = isSameButton ? currentBetAmount + amount : amount;
  setLastQuickBetAmount(amount);
  let finalAmount = newAmount;
  if (finalAmount >= maxBet) finalAmount = maxBet;
  else if (typeof balance === 'number' && finalAmount > balance && balance > 0) finalAmount = balance;
  finalAmount = Math.max(minBet, finalAmount);
  onQuickBet(finalAmount);          // = ss.onBetAmountChange → setBetAmount
}, [...]);

```

Blocking the close card (`s2` — slot 2's state, `betting` — `useBettingContext()`):
```
onClearCardClick={() => {
  const hasActiveBet = s2.bet?.state === BetState.Active || s2.bet?.state === BetState.Placed;
  if (hasActiveBet || s2.hasPendingBet || s2.isSending || isAnyAutoPlayActive) return;
  betting.setBetLayout(BetLayout.Single);
}}
onAddCardClick={() => betting.setBetLayout(BetLayout.Double)}
isCloseDisabled={isAnyAutoPlayActive || s2.bet?.state === BetState.Active || s2.bet?.state === BetState.Placed || s2.hasPendingBet || s2.isSending}

```

**The SDK does:** storing/hydrating `betInputAmount` (without clamp), storing `betLayout`, `betFailed` (3 s), `isButtonDisabled`, the fixed-freebet amount override in `placeBet`, providing `clientConfig`. **UI policy (skin responsibility):** every clamp, additive quick bet, the Max/×N formulas, `defaultBet` apply-once, range freebet clamp `[betMin, min(betMax, balanceRemaining)]`, hiding quick bets/`−`/`+` in freebet, insufficient balance → cashier, blocking the close card, mobile always-Double, the custom keyboard.

## Minimal example (React + Vite)

A single-slot amount panel. Clamp in the UI — the SDK does not do it. The action button — chapter 06.
```
import { useBetting, useBalance, useGameConfig, BetSlot, BetButtonVariant } from '@krash/react';

const FALLBACK_PRESETS = [
  { key: '2', title: '2', value: 2 }, { key: '5', title: '5', value: 5 },
  { key: '10', title: '10', value: 10 }, { key: '50', title: '50', value: 50 },
];

export function AmountPanel({ slot }: { slot: BetSlot }) {
  const { slotState, setBetAmount } = useBetting(slot);
  const balance = useBalance();
  const config = useGameConfig();

  const minBet = config?.minBet ?? 1;
  const maxBet = config?.maxBet ?? 1000;
  const step = config?.clientConfig?.betStep ?? 1;
  const presets = config?.clientConfig?.speedButtons ?? FALLBACK_PRESETS;
  const factor = config?.clientConfig?.multiplyButton?.value ?? 2;
  const factorLabel = config?.clientConfig?.multiplyButton?.title ?? '×2';

  const amount = slotState.betInputAmount;
  // bet placed / pending / sending / frozen / BETTING_CLOSING → input locked
  const locked = slotState.buttonVariant !== BetButtonVariant.Bet || slotState.isButtonDisabled;

  const clamp = (v: number) => Number(Math.max(minBet, Math.min(maxBet, v)).toFixed(2));
  const set = (v: number) => setBetAmount(clamp(Number.isFinite(v) ? v : minBet));
  const maxByBalance = Math.max(minBet, Math.min(maxBet, balance));

  return (
    <div className="amount-panel">
      <div className="amount-input">
        <button disabled={locked || amount <= minBet} onClick={() => set(amount - step)}>−</button>
        <input type="number" step={step} value={amount} disabled={locked}
               onChange={e => set(parseFloat(e.target.value))} />
        <button disabled={locked || amount >= maxBet} onClick={() => set(amount + step)}>+</button>
      </div>

      <div className="quick-bets">
        {presets.map(p => (
          <button key={p.key} disabled={locked} onClick={() => set(p.value)}>{p.title}</button>
        ))}
        <button disabled={locked} onClick={() => set(maxByBalance)}>Max</button>
        <button disabled={locked} onClick={() => set(amount * factor)}>{factorLabel}</button>
      </div>

      {slotState.betFailed && <div className="banner">Bet was not accepted</div>}
      {!locked && balance < amount && <div className="banner">Insufficient balance</div>}
    </div>
  );
}

```

For freebet add `useFreerounds()`: `state?.kind === 'fixed'` → input `disabled` and `value={state.betAmount}`; `'range'` → replace `minBet/maxBet` with `state.betMin/betMax` and hide the quick bets.

## Common mistakes

- Calling `setBetAmount` without clamp — the SDK does not check, autoplay and the next `placeBet` will go out with an invalid amount and the server will reject it.
- Treating `betFailed` as a server reject — it is "no ACK arrived before `FLYING`"; the `bet-error` event is separate and is not in the slot state.
- Locking the input only on `isButtonDisabled` — in `FLYING` the `Bet` variant is enabled (pending queue), but still unlock the input only on `variant === Bet`; if the bet is `Active` (`Cashout`), the input must be locked.
- Parsing `clientConfig.speedButtons[].title` as a number — the logic is on `value`.
- A falsy balance check in `Max` (`balance ? min(maxBet, balance) : maxBet`) — with `balance === 0` it sets `maxBet`, which the server rejects; always `max(minBet, min(maxBet, balance))`.
- Skipping the minBet floor or the balance cap in `×N` (`balance || ∞`) — with an empty balance the cap does not work, and with a zero amount the result drops below `minBet`; use the same clamp as for quick bets.
- Allowing the close card when slot 2 has a pending/active bet or autoplay — in the `Single` layout slot 2 is no longer rendered, but in the SDK the bet stays active and cancel/cashout cannot be done.
- Applying `defaultBet` on every `game-config` without the `configUpdatedAt` guard — reconnect will wipe the amount the user entered; keeping the guard only in memory overwrites the persisted amount on every page load.
- A native `<input type="number">` on mobile — the iOS keyboard breaks the viewport; use `readOnly` + a custom keyboard instead.

