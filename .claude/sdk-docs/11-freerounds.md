<!-- source: https://krash-sdk-docs.playcore.live/en/11-freerounds/ -->

# 11. Free Rounds (Free Bets)

A freeround (freebet) is a server-issued **grant** — a balance with which the player places bets without spending the wallet. The SDK covers the protocol, the grant state, attaching the `grantId` to the bet, the deferred closing of an exhausted grant, and stopping autoplay. The UI (picker, badge, modals, cashout gate, slot lock) is done by the application — below, the **SDK** and the **UI policy (skin responsibility)** are separated.

Wire-level fields (server snake_case → SDK camelCase) — 17-wire-protocol. The betting panel's freebet mode — panels/09-freebet.

## Grant statuses

```
AVAILABLE ──bind──▶ IN_PROGRESS ──▶ COMPLETED | EXPIRED | CANCELLED
              ◀──unbind──┘

```

| `FreeroundStatus` | Meaning |
| `AVAILABLE` | Issued, not yet bound |
| `IN_PROGRESS` | Bound — every `PlaceBet` carries the `grantId` |
| `COMPLETED` | The balance was used up by play |
| `EXPIRED` | The TTL passed — the remaining balance is burned |
| `CANCELLED` | Cancelled by an admin |

Only one grant is `IN_PROGRESS` at a time. `GetFreerounds` returns **only `AVAILABLE`** grants (ConnectionManager.ts:548-550) — the live data of the active one is in the `freeround` slice.

## Grant types

| `kind` | Source (`freeround_bet_config` JSON) | SDK behaviour |
| `'fixed'` | `{"totalBet": N}` → `betAmount = betMin = betMax = N` | The `amount` of `placeBet(amount)` is **ignored**, `betAmount` is sent (BettingEngine.ts:161-163, 793-795) |
| `'range'` | `{"minBet": A, "maxBet": B}` → `betMin = A`, `betMax = B`, `betAmount = A` | `amount` is sent **unchanged** — the SDK does **not** clamp to [betMin, betMax] |

`minCashout` — `minCashOutCoeff` (or `minCashout`) from the same JSON; if absent or ≤ 1, the default is `DEFAULT_MIN_CASHOUT = 1.01` (SfsProtocol.ts:138, 206-218). The comment "Default 1.5" at `events.ts:149` is outdated. The SDK **only stores** `minCashout` — it does not block cashout and does not restrict auto-cashout.

## Types (`packages/sdk/src/types/events.ts`)

```
export type FreeroundStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

/** Freeround grant — available or in progress. */                     // events.ts:131
export interface FreeroundGrant {
  grantId: string;
  status: FreeroundStatus;
  balanceRemaining: number;
  /** The grant's initial balance (server: `freeround_balance_initial`). */
  balanceInitial: number;
  roundsPlayed: number;
  kind: 'fixed' | 'range';
  /** Effective fixed bet amount (for range grants this is the min). */
  betAmount: number;
  betMin: number;
  betMax: number;
  minCashout: number;
  expiresAt?: string;      // ISO
  accruedAt?: string;      // ISO
  betConfigRaw?: string;   // original JSON
}

/** Freeround state — active grant (store slice). */                    // events.ts:168
export interface FreeroundState {
  grantId: string;
  status: FreeroundStatus;
  balanceRemaining: number;
  balanceInitial: number;
  roundsPlayed: number;
  betAmount: number;
  minCashout: number;
  /** While IN_PROGRESS, bets carry the grantId. */
  isActive: boolean;
  kind: 'fixed' | 'range';
  betMin: number;
  betMax: number;
}

export interface FreeroundHistoryEntry {                                 // events.ts:188
  grantId: string;
  status: 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  kind: 'fixed' | 'range';
  totalWin: number;
  roundsPlayed: number;
  freeRoundBalance: number;
  completedAt: string;
  expiryDate?: string;
  minCashout?: number;
}

export interface FreeroundHistoryPayload {                               // events.ts:201
  entries: FreeroundHistoryEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
}

/** The server's `FreeroundCompleted` push — the authoritative source of totalWin. */ // events.ts:213
export interface FreeroundSummaryPayload {
  grantId: string;
  roundsPlayed: number;
  balanceUsed: number;
  balanceRemaining: number;   // may be > 0 on EXPIRED
  totalWin: number;
  reason?: 'COMPLETED' | 'EXPIRED' | 'CANCELLED';  // 'COMPLETED' when absent
}

```

`PlayerBet.freeroundGrantId?: string` (betting.ts:23) — the bet remembers which grant it was placed with; needed for the cancel restore and the in-flight check.

## Store slices and API

| Store slice (`GameSnapshot`) | Type | Who writes it |
| `freeround` | `FreeroundState \| null` | `BettingEngine.syncStore()` — after the `freeround-state` event and local progress |
| `freeroundGrants` | `FreeroundGrant[]` | `freeround-list` (server) + local mirror `syncActiveGrantToList` / `removeGrantFromList` |
| `freeroundHistory` | `FreeroundHistoryEntry[]` | `freeround-history` |
| `lastFreeroundSummary` | `FreeroundSummaryPayload \| null` | `publishFreeroundSummary` / deferred flush; `acknowledgeFreeroundSummary()` resets it to `null` |

### `useFreerounds()` (`packages/react/src/hooks/useFreerounds.ts:11-66`)

| Field | Type | Semantics |
| `state` | `FreeroundState \| null` | `freeround` slice |
| `isActive` | `boolean` | `state?.isActive ?? false` |
| `grants` | `FreeroundGrant[]` | `freeroundGrants` slice |
| `history` | `FreeroundHistoryEntry[]` | The last loaded page |
| `lastCompleted` | `FreeroundSummaryPayload \| null` | Trigger for the completed modal |
| `bind(grantId)` | `(string) => void` | → `client.bindFreeround` → `BindFreeround` |
| `unbind()` | `() => void` | → `UnbindFreeround` |
| `refresh()` | `() => void` | → `GetFreerounds` |
| `loadHistory(page = 1, pageSize = 10)` | `(number?, number?) => void` | → `GetFreeroundHistory` |
| `acknowledgeCompleted()` | `() => void` | `lastFreeroundSummary = null` |

Vanilla equivalents: `client.bindFreeround`, `unbindFreeround`, `getFreerounds`, `getFreeroundHistory`, `acknowledgeFreeroundSummary` (KrashClient.ts:370-392). All are fire-and-forget — the result arrives in the store/events.

### Events

| Event | Payload | Who emits it | When |
| `freeround-state` | `FreeroundState \| null` | ConnectionManager.ts:421-437, 535-547, 556, 610; BettingEngine.ts:407, 637, 736 | JoinCrashOk, BindFreeroundOk, UnbindFreeroundOk, `Error` (stale grant), exhausted hint, finalize, cancel restore |
| `freeround-list` | `{ grants: FreeroundGrant[] }` | ConnectionManager.ts:565 | `GetFreeroundsOk` |
| `freeround-history` | `FreeroundHistoryPayload` | ConnectionManager.ts:572 | `GetFreeroundHistoryOk` |
| `freeround-completed` | `{ grantId }` | BettingEngine.ts:408 | `BetPlaced.freeround_completed === true` — UX hint, `totalWin` is not yet known |
| `freeround-summary` | `FreeroundSummaryPayload` | ConnectionManager.ts:587 | `FreeroundCompleted` push — authoritative |

## Lifecycle — as implemented

### 1. Login: `JoinCrashOk`

ConnectionManager.ts:418-440. If the response contains `freeround_grant_id` → `parseFreeroundGrant` and `freeround-state` `{ ..., isActive: status === 'IN_PROGRESS' }`; if not → `freeround-state: null`. Then `GetHistory` and `GetFreerounds` are sent → `freeround-list` a little later, asynchronously. That is, after login `state` is filled **earlier** than `grants`.

### 2. Bind / Unbind

`BindFreeround { grantId }` → `BindFreeroundOk` (the same grant fields) → `freeround-state` (ConnectionManager.ts:532-552). `UnbindFreeround` → `UnbindFreeroundOk` → `freeround-state: null` (ConnectionManager.ts:554-560). After neither does the SDK send `GetFreerounds` — the grant stays in the list with `AVAILABLE` status anyway. If you want to switch to another grant, first `unbind()`, then after `isActive === false` `bind(next)` — the reference implementation arranges this with a `pendingBindRef` (a deferred bind that fires as soon as the unbind has completed).

### 3. `placeBet` — attaching the grant

BettingEngine.ts:155-181, 184-186, 785-800:

- `grantId` is attached **only** if `freeround.isActive === true`; otherwise it is a regular wallet bet.
- `kind === 'fixed' && betAmount > 0` → the amount is replaced with `betAmount`. `range` → the amount is unchanged.
- The same rule applies to pending bets: `drainPendingBets` on `BETTING_OPEN` reads `activeGrantId()` **at the moment of sending** — if an unbind happened while waiting, the bet goes from the wallet.
- Autoplay has the same `placeBet` (KrashClient.ts:110-116, amount = `betInputAmount`) — on a fixed grant the override applies, on range the input goes as is.

### 4. `BetPlaced` — progress

BettingEngine.ts:367-425. `bet.freeroundGrantId = payload.freeroundGrantId`. If `freeroundGrantId` matches the active grant:

- `freeround_completed !== true` and `freeround_balance_remaining` arrived → `balanceRemaining` = the server's value, `roundsPlayed + 1`, `syncActiveGrantToList()` (updates the same grant in the list with `balanceRemaining/roundsPlayed/status`). The `freeround-state` event is **not** emitted, only the store.
- `freeround_completed === true` → `balanceRemaining = freeround_balance_remaining ?? 0`, `roundsPlayed + 1`, emit `freeround-state` (updated, `isActive` **still true**) and `freeround-completed { grantId }`. `freeround` is **not** cleared — the panel must keep freebet mode until the in-flight bet finishes.

`BetPlaced.balance` (wallet) is always applied to the `balance` slice — on a freebet bet it simply carries an unchanged value.

### 5. `finalizeExhaustedFreeround(force = false)` — deferred closing

BettingEngine.ts:603-642. Called from `onCashoutDone` (BettingEngine.ts:688), `onPhaseChange` on CRASHED after moving bets to `Lost` (BettingEngine.ts:356), `onCancelBetOk` (BettingEngine.ts:746) and `publishFreeroundSummary` (`force = true`, BettingEngine.ts:528).

`freeround = null` happens when and only when:

1. `freeround !== null`, and
1. `force === true` **or** `balanceRemaining < betAmount` (the grant no longer has enough for one more bet), and
1. `force === true` **or** no slot has a bet of this grant in `Placed`/`Active` state (checks both slots — if a freebet was placed in both, it waits until the last one resolves).

On closing: if `pendingFreeroundSummary` belongs to this grant → `lastFreeroundSummary = pending`; `freeround = null`; emit `freeround-state: null`; `removeGrantFromList(grantId)` — the grant disappears from the local list, it does not remain as a `COMPLETED` entry.

On a range grant, condition 2 means `balanceRemaining < betMin` (`betAmount === betMin`).

### 6. `FreeroundCompleted` push — `freeround-summary`

BettingEngine.ts:440-486, 503-516, 524-530, 649-662:

1. **Dedup**: if `lastFreeroundSummary` is already for this `grantId` (the app has not yet called `acknowledgeCompleted`), the push is ignored.
1. **`reason === 'EXPIRED' | 'CANCELLED'`** → immediately `publishFreeroundSummary` → `lastFreeroundSummary = payload` + `finalize(force)`. `balanceRemaining` may be > 0. In these two cases `freeround-completed` (the BetPlaced hint) **never** arrives.
1. **`COMPLETED` + an in-flight freebet bet** (`hasInFlightFreebetBet`: a `Placed/Active` bet in a slot with this `grantId`, **or** `isSending === true` with a match on the active grant; a pending bet does **not** count) → the payload is stored in `pendingFreeroundSummary`. The server sometimes sends two pushes (an early one with `totalWin = 0`, then the final one) — the later one **overwrites** the earlier one. The flush happens in `finalize`, when the bet resolves.
1. **`COMPLETED` + no in-flight** → publish immediately (this also covers the ordinary case of "the bet already finished, the summary came afterwards").

The `freeround-summary` event is always emitted — defer/dedup only concerns the store's `lastFreeroundSummary`. For the modal use `useFreerounds().lastCompleted`, not the raw event.

### 7. Cancel — restoring the grant

BettingEngine.ts:694-750. On `CancelBetOk`, if `payload.freeroundGrantId ?? cancelledBet.freeroundGrantId` matches the active grant:

- `balanceRemaining = payload.freeroundBalanceRemaining ?? balanceRemaining + cancelledBet.amount` (the server's value takes priority, otherwise an optimistic restore)
- `roundsPlayed = max(0, roundsPlayed - 1)`
- emit `freeround-state`, `syncActiveGrantToList()`, then `finalizeExhaustedFreeround()` (in case the other slot's bet had already finished and this was the last blocker).

`GetFreerounds` is **not** sent — the comment in `BettingEngine.ts:716-717` is outdated; `KrashClient.ts:164-170` says explicitly that the automatic refresh happens only on `JoinCrashOk`.

### 8. Server `Error` — stale grant

ConnectionManager.ts:595-614. If `Error.error` contains `NO_BOUND_GRANT` or `GRANT_EXPIRED` → `freeround-state: null` + `GetFreerounds` (the only automatic refresh after login). This covers the case where the grant is already dead on the server but the client did not receive `FreeroundCompleted`. `error` and (if `slot` is present) `bet-error` are still emitted — the toast is the application's job.

### 9. Persistence

None — no freeround field is written to `PersistentState`; after a refresh everything comes from `JoinCrashOk`. An unseen `lastFreeroundSummary` is lost (it remains in the history).

## What the SDK does **not** do

| Does not do | How the reference implementation does it |
| Clamping the amount on a range grant to `[betMin, min(betMax, balanceRemaining)]` | in the betting adapter hook, before sending |
| Blocking manual cashout at `multiplier < minCashout` | a guard wrapper around the cashout button + a gate in the betting adapter hook |
| Forbidding the auto-cashout input below `minCashout` and the freebet override | auto-cashout input validation in the betting adapter hook |
| `BetButtonVariant.Freebet` — `computeButtonVariant` never returns it | the panel renders it itself (only on the idle `Bet` variant) |
| Slot 1/2 lock on the last free bet ("effective remaining" = `floor(balanceRemaining/betAmount) − pending/isSending`) | an "effective remaining" computation in the betting adapter hook |
| Blocking `placeBet` in the deferred window (`isActive` true, `balanceRemaining = 0`) — such a bet goes to the server and receives an `Error` | The same slot lock |
| Stopping autoplay on a manual `unbind()` (the SDK only stops on `freeround-completed`) | an effect on `isActive` true→false |
| `GetFreerounds` after cancel/complete/cashout/crash | `refresh()` when the picker opens |
| Sorting grants by expiry, dedup of the credited modal | in the picker and credited-modal components |

The active grant may not even be in `grants`. Read `kind/betMin/betMax/minCashout` **from `state`**, not from `grants.find(...)`.

## UI recipes

### X/Y badge

```
// range → money (Y = the server's freeround_balance_initial)
const label = `${state.balanceRemaining}/${state.balanceInitial}`;
// fixed → number of bets
const x = Math.floor(state.balanceRemaining / state.betAmount + 1e-9);
const y = Math.floor(state.balanceInitial   / state.betAmount + 1e-9);

```

`+ 1e-9` because of IEEE-754 (`0.7 / 0.1 → 6.999…`). In the list, use `state.balanceRemaining` for the active grant and `g.balanceRemaining` for the others. On a legacy backend `balanceInitial` equals `balanceRemaining` (SfsProtocol.ts:254-256) — on a partly used grant Y shrinks until the server adds the field.

### Credited modal (new grant)

The SDK has no notion of a "new grant" — you listen to `grants` and open the modal on the first unseen `AVAILABLE`. The reference implementation: sorts by expiry, marks all currently `AVAILABLE` grants as "seen" at once (against a cascade), localStorage `skin:seenFreeroundGrants:<sessionToken>`, another popup is open → does not open.

### Completed modal

```
lastCompleted !== null → modal (copy by reason: COMPLETED / EXPIRED / CANCELLED)
   └─ close → acknowledgeCompleted()   // otherwise the next summary for the same grantId is lost to dedup

```

`totalWin` is only here — the `freeround-completed` event does not have it.

### Autoplay

- When the free bet is exhausted (`freeround-completed`), `KrashClient.ts:171-177` stops autoplay in both slots with `AutoPlayStopReason.FREEROUND_COMPLETED` → `autoplay-stop` event. No wallet fallback happens, because `freeround.isActive` is still true and the next `placeBet` would attach the `grantId` anyway — autoplay simply stops calling it.
- On `EXPIRED`/`CANCELLED` autoplay is **not** stopped automatically — `freeround-state: null` arrives and the next autoplay bet goes from the wallet. The reference implementation stops it when `isActive` goes to false.
- The reference implementation additionally: one last free bet + autoplay on both slots → slot 2 stops; on range, `slot1 + slot2 > balanceRemaining` → slot 2, then slot 1.

### Reconnect

On reconnect `JoinCrashOk` arrives again → `freeround-state` according to the server (the bound grant remains on the server), then `GetFreerounds`. `RoundMyBets` restores bets with `freeroundGrantId` (BettingEngine.ts:765, 775), so the in-flight check works. `pendingFreeroundSummary`/`lastFreeroundSummary` are **not** cleared. A missed `FreeroundCompleted` push is not recovered — the next bet's `Error NO_BOUND_GRANT` or `refresh()` corrects it.

## Minimal example (React + Vite)

```
import { useFreerounds } from '@krash/react';
import type { FreeroundGrant } from '@krash/react';

function badge(g: { kind: 'fixed' | 'range'; balanceRemaining: number; balanceInitial: number; betAmount: number }) {
  if (g.kind === 'range') return `${g.balanceRemaining}/${g.balanceInitial}`;
  const x = g.betAmount > 0 ? Math.floor(g.balanceRemaining / g.betAmount + 1e-9) : 0;
  const y = g.betAmount > 0 ? Math.floor(g.balanceInitial / g.betAmount + 1e-9) : 0;
  return `${x}/${y}`;
}

export function FreeBetWidget() {
  const { state, isActive, grants, history, lastCompleted, bind, unbind, refresh, loadHistory, acknowledgeCompleted } =
    useFreerounds();

  return (
    <div>
      <button onClick={refresh}>Refresh</button>

      {isActive && state && (
        <p>
          Active {state.kind} freebet {badge(state)} · min cashout {state.minCashout}x{' '}
          <button onClick={unbind}>Deactivate</button>
        </p>
      )}

      {grants
        .filter((g: FreeroundGrant) => g.status === 'AVAILABLE')
        .map((g) => (
          <div key={g.grantId}>
            {g.kind === 'fixed' ? `${g.betAmount} per bet` : `${g.betMin}–${g.betMax}`} · {badge(g)}
            {g.expiresAt && ` · expires ${new Date(g.expiresAt).toLocaleString()}`}
            <button disabled={isActive} onClick={() => bind(g.grantId)}>Activate</button>
          </div>
        ))}

      {lastCompleted && (
        <dialog open>
          <p>
            {lastCompleted.reason === 'EXPIRED' ? 'Free bet expired' : 'Free bet finished'} — win {lastCompleted.totalWin}
          </p>
          <button onClick={acknowledgeCompleted}>OK</button>
        </dialog>
      )}

      <button onClick={() => loadHistory(1, 10)}>History</button>
      <ul>
        {history.map((h) => (
          <li key={h.grantId}>{h.status} · {h.kind} · win {h.totalWin} · {h.roundsPlayed} rounds</li>
        ))}
      </ul>
    </div>
  );
}

```

## Common problems

| Symptom | Cause | Solution |
| The completed modal does not appear a second time | `acknowledgeCompleted()` was not called — dedup on `grantId` | Always acknowledge on modal close |
| `totalWin = 0` in the modal | You are using the `freeround-completed` event | Only `lastCompleted` / `freeround-summary` |
| The panel is "stuck" in freebet mode after the last free bet | Deferred window — the in-flight bet has not finished yet | Normal; it passes on cashout/crash/cancel |
| The server rejected a range bet | The SDK does not clamp | Clamp in the UI to `[betMin, min(betMax, balanceRemaining)]` |
| Cashout went through below `minCashout` | The SDK does not gate | A guard wrapper around the cashout button (`multiplier < minCashout` → the click is ignored) |
| Autoplay continued with the wallet after EXPIRED | The SDK only stops on `freeround-completed` | `stop()` on `isActive` true→false |
| `Error: NO_BOUND_GRANT` on a bet | The grant is dead on the server, the client did not receive the push | The SDK cleans up itself + `GetFreerounds`; the toast is yours |
| A bet went without `grantId` | `isActive` was false at send time (a pending bet after unbind) | Block bind/unbind while a bet is pending/active (an `isBetBlocked` flag in the reference implementation) |
| `expiresAt` undefined | No known expiry field arrived | `?debug=1` → `[FR] grant keys:`; see 17 |

