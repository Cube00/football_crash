<!-- source: https://krash-sdk-docs.playcore.live/en/04-betting/ -->

# 4. Betting System

The full bet cycle: `SlotSnapshot`, the exact decision table for button variants, pending bets, timeouts, the real meaning of `betFailed`, win display, recovery on reconnect, the relationship between freebet and cancel, `useBettingSlot`, double slot. And a separate list of what the **SDK does not do** and the UI must do itself. Source — `packages/sdk/src/betting/BettingEngine.ts`, `betting/buttonVariant.ts`, `core/KrashClient.ts:300-353`, `packages/react/src/hooks/useBetting.ts`, `useBettingSlot.ts`.

## `useBetting(slot)`

```
const {
  slotState,     // SlotSnapshot
  placeBet,      // (amount: number, opts?: { autoCashoutAt?: number }) => void
  cashout,       // () => void
  cancelBet,     // () => void
  setBetAmount,  // (amount: number) => void  → client.setBetInputAmount(slot, amount)
} = useBetting(BetSlot.Slot1);

```

`BetSlot.Slot1 = 0`, `BetSlot.Slot2 = 1` (1/2 on the server — `SfsProtocol.toServerSlot` translates). The hook sits on `store.subscribeToSlot(slot)` — it re-renders on a change of this slot's snapshot. Keep in mind: `BettingEngine.syncStore()` always recreates both slot objects, so any sync (including the `balance` event, which arrives roughly every 5 seconds via keep-alive) triggers the listeners of both slots.

## `SlotSnapshot` and `PlayerBet`

`types/betting.ts:10-45`:
```
interface PlayerBet {
  id: string;               // server betId; '' on a bet restored from RoundMyBets
  amount: number;
  state: BetState;          // 'idle' | 'placed' | 'active' | 'won' | 'lost'
  cashedOutAt?: number;     // Won only
  payout?: number;          // Won only
  freeroundGrantId?: string; // if the bet was placed with a grant (BetPlaced.freeround_grant_id)
}

interface SlotSnapshot {
  bet: PlayerBet | null;
  betInputAmount: number;    // default 5; persisted
  hasPendingBet: boolean;    // queued, will be sent on the next BETTING_OPEN
  betFailed: boolean;        // see §betFailed — not "the server rejected it"
  buttonVariant: BetButtonVariant;
  isButtonDisabled: boolean;
  isSending: boolean;        // PlaceBet sent, BetPlaced not yet received
}

```

The snapshot does **not** contain `isCashingOut` and `isCancelling` — they are internal engine flags and are reflected only in `buttonVariant`/`isButtonDisabled` (the `CashingOut` variant; the `Cancel` variant with disabled).

### Bet lifecycle

```
Idle → (PlaceBet sent: isSending) → Placed → Active → Won   (CashoutDone)
                                                    → Lost  (CRASHED)
                 ↑ pending (hasPendingBet) — not sent yet

```

| `BetState` | When it is set | Who |
| `Idle` | `bet === null` (`state` is not visible in the snapshot — `bet` itself is `null`) | — |
| `Placed` | `BetPlaced` arrived before FLYING | `BettingEngine.onBetPlaced` |
| `Active` | The phase became FLYING (`Placed → Active`), or `BetPlaced` arrived during FLYING | `onPhaseChange(FLYING)` |
| `Won` | `CashoutDone` | `onCashoutDone` — `cashedOutAt`, `payout` |
| `Lost` | The phase became CRASHED and the bet was `Placed`/`Active` | `onPhaseChange(CRASHED)` |

`Won`/`Lost` stays on the slot until the next `BETTING_OPEN` (`bet = null`), `CancelBetOk` → `bet = null` immediately.

## `computeButtonVariant` — full decision table

`buttonVariant.ts:24-111`. Input: `phase`, `betState`, `hasPendingBet`, `isSending`, `isCashingOut`, `isCancelling`, `isFrozen`, `isAutoPlayActive`. The order of checks matters — the first match wins.

**Pre-phase rules (in order):**

| # | Condition | variant | disabled |
| 1 | `isFrozen` | `Active` → `Cashout`, otherwise → `Bet` | `true` |
| 2 | `isCashingOut` | `CashingOut` | `true` |
| 3 | `isSending` | `Cancel` | `true` |

**Phase rules** (only if 1–3 did not match):

| Phase | `betState` | `hasPendingBet` | `isAutoPlayActive` | variant | disabled |
| BETTING_OPEN | `Placed` | — | — | `Cancel` | `false` |
| BETTING_OPEN | other | `true` | — | `Cancel` | `false` |
| BETTING_OPEN | other | `false` | `true` | `CancelWaiting` | `false` |
| BETTING_OPEN | other | `false` | `false` | `Bet` | `false` |
| BETTING_CLOSING | `Placed` / `Active` | — | — | `Cancel` | `true` |
| BETTING_CLOSING | other | `true` | — | `CancelWaiting` | `true` |
| BETTING_CLOSING | other | `false` | — | `Bet` | `true` |
| FLYING | `Active` | — | — | `Cashout` | `false` |
| FLYING | `Placed` | — | — | `CancelWaiting` | `true` |
| FLYING | `Idle` / `Won` / `Lost` | `true` **or** autoplay `true` |  | `CancelWaiting` | `false` |
| FLYING | `Idle` / `Won` / `Lost` | `false` | `false` | `Bet` | `false` |
| CRASHED | `Lost` / `Active` / `Placed` | — | — | `Lost` | `true` |
| CRASHED | `Idle` / `Won` | `true` **or** autoplay `true` |  | `CancelWaiting` | `false` |
| CRASHED | `Idle` / `Won` | `false` | `false` | `Bet` | `false` |

**Final rule:** `isCancelling === true` → the variant computed above stays, `disabled = true`.

What the SDK **never** returns: `Sending`, `Cancelling`, `Freebet`. These three exist in the enum, but `computeButtonVariant` has no path to them. `Freebet` — UI policy (skin responsibility): the reference implementation replaces the `Bet` variant with `Freebet` in freebet mode and leaves the other variants (Cashout/Cancel) unchanged. If you want freebet styling in your skin, do the same — `useFreerounds().isActive && variant === Bet`.

Important details: - `CancelWaiting` is **enabled** in FLYING/CRASHED while pending or autoplay is on — on click you should call `cancelBet()` (cancel the pending bet) and/or stop autoplay. It is disabled only in BETTING_CLOSING and in FLYING on a `Placed` bet. - A `Won` bet in FLYING/CRASHED returns the `Bet` variant (enabled) — click → `placeBet` → pending for the next round. The `Lost` override on CRASHED and showing the win is UI policy (skin responsibility). - On `isSending`, `Cancel` is shown disabled — the user sees that the bet "went out" but cannot cancel it until `BetPlaced` arrives.

Skin mapping example:
```
import { useBetting, useMultiplier, BetSlot, BetButtonVariant } from '@krash/react';

function BetButton({ slot }: { slot: BetSlot }) {
  const { slotState, placeBet, cashout, cancelBet } = useBetting(slot);
  const multiplier = useMultiplier();

  const label = (): string => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet:           return `Bet ${slotState.betInputAmount}`;
      case BetButtonVariant.Cashout:       return `Cashout ${(slotState.bet?.amount ?? 0) * multiplier}`;
      case BetButtonVariant.Cancel:        return slotState.isSending ? 'Sending…' : 'Cancel';
      case BetButtonVariant.CancelWaiting: return 'Cancel (next round)';
      case BetButtonVariant.CashingOut:    return 'Cashing out…';
      case BetButtonVariant.Lost:          return 'Lost';
      default:                             return '…';
    }
  };

  const onClick = () => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet:           placeBet(slotState.betInputAmount); break;
      case BetButtonVariant.Cashout:       cashout(); break;
      case BetButtonVariant.Cancel:
      case BetButtonVariant.CancelWaiting: cancelBet(); break;
      default: break;
    }
  };

  return (
    <button onClick={onClick} disabled={slotState.isButtonDisabled}>
      {label()}
    </button>
  );
}

```

## `placeBet(slot, amount, { autoCashoutAt? })`

`BettingEngine.placeBet` (`:155-181`):

1. If the active freeround grant is of type `fixed` and `betAmount > 0` → `amount` is **ignored**, the grant's `betAmount` is sent. On a `range` grant **no** clamp happens — whatever you pass is what goes out.
1. `phase === BETTING_OPEN && !bet && !pendingBet` → `isSending = true`, PlaceBet is sent, 5000 ms timeout.
1. Otherwise, if there is no `pendingBet` yet → `pendingBet = { slotIndex, amount, autoCashoutAt }`, `hasPendingBet = true`.
1. If `pendingBet` already exists → **nothing** (the second call is silently ignored; the new amount is not recorded — `cancelBet()` first).

Wire (`SfsProtocol.buildPlaceBetObject`): `PlaceBet { amount: double, currency: string, slot: 1|2, autoCashoutAt?: double, grantId?: string }`. `autoCashoutAt` is sent only if `> 1.0`; `currency` — `gameConfig.currencyCode` (or the session's currency until the config has arrived).

`autoCashoutAt` — **server-side** auto-cashout: the server itself performs the cashout at this multiplier and sends `CashoutDone`; the client has nothing to do. `useBettingSlot().onBet` and autoplay automatically pass `autoPlayConfig.autoCashOut` when it is `enabled`.

### Pending bets

- Queued in any non-BETTING_OPEN phase (including BETTING_CLOSING — it does not reject), **and** in BETTING_OPEN too, if the slot already has a `Placed` bet.
- On `BETTING_OPEN`, `drainPendingBets` sends both slots — with the freeround grant active at that moment (the fixed override applies here too).
- `cancelBet()` on a pending bet → removed locally, **nothing is sent to the server** (`BettingEngine.cancelBet` → `false`).
- After a refresh, pending is **not restored** — it is written to localStorage, but nobody reads it (02).
- When `bet-placed` arrives, `pendingBet = null` (if anything was left).

## `cashout(slot)`

`KrashClient.cashout` → `BettingEngine.cashout(slot)` + `connectionManager.sendCashout(slot)` — **always** sent, regardless of phase and bet state. The engine sets `isCashingOut = true` and a 3000 ms timeout only on an `Active` bet. A Cashout sent on a non-Active bet will return an `Error` extension response from the server → `'error'` event (and `'bet-error'`, if the response contains `slot`). The UI should show the button according to the `Cashout` variant — then this does not happen.

`CashoutDone` (wire `slot`, `multiplier`, `payout`, `betAmount`, `balance?`, `freeround_grant_id?`, `betType?`, `betMode?`): `bet.state = Won`, `cashedOutAt`, `payout`; `winAmount = payout`, `winTimestamp = Date.now()`; balance.

## `cancelBet(slot)`

`KrashClient.cancelBet` (`:321-326`) → `BettingEngine.cancelBet` returns whether sending to the server is needed:

| Slot state | Locally | On the server |
| `pendingBet` exists | Removed, `hasPendingBet = false` | Nothing |
| `bet.state` = `Placed` / `Active` | `isCancelling = true`, 3000 ms timeout | `CancelBet { slot }` |
| `Idle` / `Won` / `Lost` | Nothing | Nothing (no-op) |

`CancelBetOk` (wire `slot`, `betId`, `balance?`, `freeround_grant_id?`, `freeround_balance_remaining?`) → `bet = null`, `isCancelling = false`, balance.

## Timeouts and internal flags

`BettingEngine.ts:57-60`:

| Flag | Set | timeout | On timeout |
| `isSending` | when `placeBet` sends / `drainPendingBets` | **5000 ms** | `isSending = false` (no bet is created, `betFailed` is not set) |
| `isCashingOut` | `cashout()` on an `Active` bet | **3000 ms** | `false` |
| `isCancelling` | `cancelBet()` on `Placed`/`Active` | **3000 ms** | `false` |

There is one timeout per slot — a new call cancels the previous one. The corresponding ACK (`BetPlaced`/`CashoutDone`/`CancelBetOk`) clears the timeout. `BETTING_OPEN` clears all timeouts and flags.

### `betFailed` — what it really means

`betFailed = true` is set in **exactly one** case (`BettingEngine.ts:334-341`): the phase became `FLYING`, the slot had `isSending === true` and `bet === null` — that is, PlaceBet went out, but `BetPlaced` did not arrive before the round started. Automatically `false` after 3000 ms. This is **not** "the server rejected it": the server's `Error` response arrives as `'error'`/`'bet-error'` events and **does not change the slot state** — `isSending` stays until the 5000 ms timeout. If you want a toast on a server rejection, listen to `client.on('bet-error', ({ slotIndex, error }) => ...)`.

## Win display

`store.winAmount` (`number | null`) and `store.winTimestamp` (`number`, `Date.now()`): - Written on `CashoutDone` — **one** shared value for both slots (the last cashout wins). - Reset on `BETTING_OPEN` and on `client.clearWin()`. - React: `useWinDisplay()` → `{ winAmount, winTimestamp, clearWin }`. Use `winTimestamp` as the key so that two wins of the same amount show as separate toasts.

Per-slot win display is provided by `slotState.bet.payout`/`cashedOutAt` (`Won` state).

## Reconnect and recovery

### `round-my-bets` (automatic)

On every `ROOM_JOIN` (first join and every reconnect) the SDK sends `GetRoundMyBets` → `RoundMyBets` (wire `roundId`, `bets[] { slot, amount, status, cashedOutAt?, payout?, freeround_grant_id? }`) → `'round-my-bets'` → `BettingEngine.onRoundMyBets` (`:752-781`):

- `status === 'ACTIVE' | 'PLACED'` → `bet = { id: '', amount, state: Active|Placed, freeroundGrantId }`, `isSending = false`.
- `status === 'CASHED_OUT'` and `payout` is present → `bet = { id: '', state: Won, cashedOutAt, payout }`.
- Other statuses are ignored; slots **absent** from the list are **not cleared** — a local bet that existed before the reconnect stays until `RoundMyBets` overwrites it or `BETTING_OPEN` removes it.

`id: ''` means the restored bet has no betId — cancel/cashout work by `slot`, so this is not a problem.

### `missed-round-bets`

If `BETTING_OPEN` arrived and the slot still has a `Placed`/`Active` bet (the round result — `CashoutDone` or CRASHED — was missed, typically in the reconnect gap), the SDK emits `'missed-round-bets' { bets: [{ slotIndex, amount, state }] }` and then clears the slot. The SDK does not know the result (won or lost) — use `useMyBets().fetch()` (`GetMyHistory`) or `fetchRecoveryBets`.

### `fetchRecoveryBets` (manual)

```
import { fetchRecoveryBets, RoundMismatchError } from '@krash/sdk';

async function checkBet(apiBaseUrl: string, sessionToken: string, roundId: string) {
  try {
    const bets = await fetchRecoveryBets(apiBaseUrl, sessionToken, roundId);
    // RecoveryBet: { betId, slot, roundId, betAmount: { amount, currency }, status,
    //               payoutMultiplier, payoutAmount, autoCashoutMultiplier }
    return bets;
  } catch (err) {
    if (err instanceof RoundMismatchError) {
      // the round has already changed — err.currentRoundId
      return [];
    }
    throw err;
  }
}

```

`GET {apiBaseUrl}/seamless/session/recovery/bets?roundId=<id>`, header `X-Game-Session-Token: <sessionToken>` (`session.sessionToken` — `useKrashState().session` or `client.getSession()`). This is the only endpoint that sends the session token in a header. The SDK **never calls this itself** — after the 5000 ms `isSending` timeout or on `missed-round-bets`, you decide.

## Cancel and freebet

On cancel of a bet placed with a freeround grant (`BettingEngine.onCancelBetOk`, `:694-750`):

1. `freeroundGrantId` is taken from `CancelBetOk.freeround_grant_id`, otherwise from the cancelled `PlayerBet.freeroundGrantId`.
1. If it matches the active grant: `balanceRemaining` = the server's `freeround_balance_remaining` (if it arrived), otherwise locally `+ bet.amount`; `roundsPlayed - 1`. `'freeround-state'` is emitted, the corresponding grant in `store.freeroundGrants` is updated locally (`syncActiveGrantToList`).
1. **`GetFreerounds` is not sent** — `KrashClient.ts:164-170` says this explicitly (it is a heavy operation). The authoritative list arrives only on `JoinCrashOk` and `client.getFreerounds()`. If the picker needs a "server" list, call `refresh()` when opening it.

The rest of the freebet logic — 11-freerounds.

## `useBettingSlot(slot)` — all-in-one

`packages/react/src/hooks/useBettingSlot.ts` — `useBetting` + `useAutoPlay` in one object (`BettingSlotReturn`):

| Field | Type | What it does |
| `slotState` | `SlotSnapshot` | Same as `useBetting` |
| `onBet(amount)` | `(amount: number) => void` | `placeBet(amount, { autoCashoutAt })`, where `autoCashoutAt` = `autoPlayConfig.autoCashOut.multiplier`, if `enabled` |
| `onBetAmountChange(amount)` |  | `client.setBetInputAmount` |
| `cashout()`, `cancelBet()` |  | Same |
| `autoCashout` | `AutoCashoutState` | `{ enabled, multiplier, onToggle, onMultiplierChange, canChangeMultiplier: !isAutoPlayActive }` — stored in `autoPlayConfig[slot].autoCashOut` (persisted) |
| `isAutoPlayActive` | `boolean` | `engine.isActive` |
| `autoPlayRemainingRounds` | `number` | `engine.remainingRounds` |
| `autoPlayConfig` | `AutoPlayConfig` |  |
| `onStartAutoPlay()` |  | `start(config.rounds || engine.totalRounds)`, if `> 0` |
| `onStopAutoPlay()` |  | `stop()` (MANUAL_STOP) |
| `updateAutoPlayConfig(partial)` |  | `engine.updateConfig` |

The SDK does **not** check the auto-cashout toggle against the freebet's `minCashout` — the UI must do this itself (the reference implementation does it in its betting adapter hook). Autoplay details — 05-autoplay.

## Double slot

`BetLayout.Single | Double`, default **`Double`** (`KrashStore.ts:42`, `BettingEngine.ts:52`), persisted (`betLayout`). `useBetLayout()` → `{ layout, setLayout }`, vanilla — `client.setBetLayout(layout)`.
```
import { useBetLayout, BetSlot, BetLayout } from '@krash/react';

function BetPanels() {
  const { layout, setLayout } = useBetLayout();
  return (
    <div>
      <BetButton slot={BetSlot.Slot1} />
      {layout === BetLayout.Double && <BetButton slot={BetSlot.Slot2} />}
      <button onClick={() => setLayout(layout === BetLayout.Double ? BetLayout.Single : BetLayout.Double)}>
        {layout === BetLayout.Double ? 'Single' : 'Double'}
      </button>
    </div>
  );
}

```

`setBetLayout(Single)` does **not** cancel the second slot's bet/pending — the layout is only a UI flag. Call `cancelBet(Slot2)` yourself before switching to Single, if you want that. The reference implementation always draws `Double` on mobile.

## UI must do itself — what the SDK does not do

The SDK sends `placeBet` **without validation**. Everything listed below must be in your UI; the reference implementation is given as an example, not as SDK behaviour.

| Check | SDK | Reference implementation (policy) |
| `minBet ≤ amount ≤ maxBet` (`gameConfig`) | No | clamp on +/-/quick buttons and on multiply |
| Range freebet: `betMin ≤ amount ≤ betMax` | No (only the fixed override) | `Math.min(betMax, Math.max(betMin, input))` |
| `minCashout` — blocking cashout below the multiplier | No (`cashout()` is always sent) | cashout button guard — `useMultiplier() < minCashout` → disabled |
| Insufficient balance (`amount > balance`) | No | autoplay stop, open the cashier, notice |
| Auto-cashout `≥ minCashout` in freebet | No | auto-cashout override with the grant's `minCashout` |
| Slot lock when the freebet balance is no longer enough for one bet | No | reservation logic |
| Validating the input as a number, `NaN`/negative | No (`setBetInputAmount` stores everything; persistence validate only keeps `>= 0`) | input handlers |
| `autoCashoutAt > 1.0` | **Yes** — `≤ 1.0` is simply not sent | — |
| Fixed freebet amount | **Yes** — override | — |

The server also checks (min/max, balance, phase) and returns `Error` — but that is only an `'error'`/`'bet-error'` event, the slot stays in `isSending` for 5 seconds. Client-side validation is essential for UX.

## Common mistakes

- Relying on a `switch` over the `Sending`/`Cancelling`/`Freebet` variants — they never arrive. `isSending` is a snapshot field, the `Cancel`+disabled combination.
- Drawing `CancelWaiting` as disabled in FLYING/CRASHED — the SDK returns enabled, the user must be able to cancel the pending bet.
- Interpreting `betFailed` as "the server rejected it" — listen to `bet-error`.
- Changing a pending bet's amount with a second `placeBet` — ignored; `cancelBet()` first.
- Calling `cashout()` without the `Cashout` variant — it is always sent and causes a server error.
- Expecting pending after a refresh — it is not restored.
- Calling `useBetting` in many small components — every `syncStore` triggers all of them; take it in one panel component and pass it down via props.

