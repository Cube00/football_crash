<!-- source: https://krash-sdk-docs.playcore.live/en/panels/09-freebet/ -->

# 09. Free Bet (freeround) panel

The Free Bet panel is a grant picker: a list of "Play with real money" + AVAILABLE grants (radio), Archive (history), and a Start/Deactivate button. In the reference implementation it opens in the sidebar on desktop (`SidebarArea.FreeBet`), in a `Popup` on mobile (`Popups.FREE_BET`). On top of that there are two modals — **credited** ("a new free bet has been credited to you", Play now) and **completed** (totalWin + reason) — the side-menu badge and the betting panel's freebet behaviours, which are covered in detail in chapters 05, 06 and 07.

## What it shows

- **Picker list** — a `real-money` row; one `bet-type` row per AVAILABLE grant: Type (`fixed`/`range`), Bet Amount badge `X/Y`, Bet price (for fixed), expandable details: Min. Withdrawal (`minCashout`x), Bet Range (for range `betMin - betMax`), Expiration Date.
- The active grant's row with an "Active" label and `Rounds played: N`.
- **Archive** — history entries (`archive` type): Type, totalWin, Expiration/Completed date, Min. Withdrawal.
- **Start / Deactivate** button (`BetButtonVariant.Freebet`) — tooltip if blocked.
- **Credited modal** — count (fixed: number of bets, range: amount + currency), expiry ("D days H hours" / "H hours" / "M minutes"), Play now.
- **Completed modal** — totalWin + currency, subtitle "finished" or "expired" (`EXPIRED`/`CANCELLED`), "press anywhere".
- **Side-menu** — freebet icon + `CountBadge` with the remaining free bets.

## SDK sources

| Data | Source | Type | Note |
| `state` | `useFreerounds().state` | `FreeroundState \| null` | store `freeround`; comes from the `freeround-state` event (JoinCrashOk, BindFreeroundOk, UnbindFreeroundOk, bet progress, `NO_BOUND_GRANT`/`GRANT_EXPIRED` error → null) |
| `isActive` | `useFreerounds().isActive` | `boolean` | `state?.isActive ?? false` (`status === 'IN_PROGRESS'`) |
| `grants` | `useFreerounds().grants` | `FreeroundGrant[]` | store `freeroundGrants`; the server returns **only AVAILABLE** grants in `GetFreeroundsOk`; the SDK mirrors the active grant's `balanceRemaining/roundsPlayed/status` locally (`syncActiveGrantToList`) and removes an exhausted one from the list (`removeGrantFromList`) |
| `history` | `useFreerounds().history` | `FreeroundHistoryEntry[]` | `GetFreeroundHistoryOk` → store `freeroundHistory` |
| `lastCompleted` | `useFreerounds().lastCompleted` | `FreeroundSummaryPayload \| null` | `FreeroundCompleted` push → `freeround-summary` → `BettingEngine.onFreeroundSummary`; `COMPLETED` is deferred until the in-flight bet settles, `EXPIRED`/`CANCELLED` are written immediately; dedupe on the same `grantId` while the slice is non-null |
| grant wire fields | `connection/SfsProtocol.ts:parseFreeroundGrant` | — | `freeround_grant_id`, `freeround_status`, `freeround_balance_remaining`, `freeround_balance_initial` (fallback remaining), `freeround_rounds_played`, `freeround_bet_config` (kind/betAmount/betMin/betMax/minCashout), `expiryDate` → `expiresAt`, `createdAt` → `accruedAt` |
| history wire fields | `parseFreeroundHistory` | — | `grant_id`, `status`, `bet_mode === 'BET_RANGE'` → `kind:'range'`, `total_win`, `rounds_played`, `free_round_balance`, `completed_at`, `expiry_date`, `min_cashout_coeff` |
| autoplay stop | `client.on('autoplay-stop')` `reason === FREEROUND_COMPLETED` | — | `freeround-completed` (BetPlaced `freeround_completed=true` hint) → both engines stop |

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Opening the panel (available view) | `refresh()` | `client.getFreerounds()` → `GetFreerounds`; response `freeround-list` → `grants` changes |
| Archive | `loadHistory()` | `client.getFreeroundHistory(page=1, pageSize=10)` → `GetFreeroundHistory` |
| Start (not active) | `bind(grantId)` | `BindFreeround` → `BindFreeroundOk` → `freeround-state {isActive:true}`. **The SDK does not repeat `GetFreerounds`** |
| Deactivate (selected === active) | `unbind()` | `UnbindFreeround` → `UnbindFreeroundOk` → `freeround-state null` |
| Switch (active, a different one selected) | `unbind()`, then on `isActive → false` `bind(pending)` | the reference implementation's sequencing (`pendingBindRef`) — the SDK has no "switch" operation |
| Credited modal → Play now | `bind(freshGrant.grantId)` + close | Same as Start |
| Completed modal → any close | `acknowledgeCompleted()` | `store.lastFreeroundSummary = null` — without this the next summary on the same grant is lost to dedupe and the modal reopens on every mount |

## SDK vs UI policy

| Behaviour | The SDK does | UI policy (skin responsibility) |
| Grant list, bind/unbind, history | ✔ (`getFreerounds`, `bindFreeround`, `unbindFreeround`, `getFreeroundHistory`) | picker UI, sort `expiresAt` asc., stale `selectedGrantId` cleanup |
| Live balance of the active grant | ✔ `FreeroundState` + list mirror | badge `X/Y` formula (range → money, fixed → count `floor(bal/betAmount + 1e-9)`) |
| Bet amount on a fixed grant | ✔ `placeBet` replaces the amount with `betAmount` (`betting/BettingEngine.ts:161-164`) | input lock (`freebetInputLocked`) |
| Amount clamp on a range grant `[betMin, min(betMax, balanceRemaining)]` | ✘ | amount clamp in the adapter hook |
| Blocking manual cashout below `minCashout` | ✘ | `CashoutGuardedBetButton` + `minCashoutGate` |
| Auto cashout multiplier ≥ `minCashout` | ✘ | per-slot override + localStorage (see 07) |
| `Freebet` button variant | ✘ (`computeButtonVariant` does not return it) | the betting panel's variant override |
| Slot 1 / slot 2 lock (the last free bet goes to slot 1) | ✘ | slot lock in the adapter hook (see below) |
| Autoplay stop when the grant is exhausted | ✔ `freeround-completed` → `stop(FREEROUND_COMPLETED)` | + slot 2 auto-stop on the last free bet, range guard, `autoCashOut.enabled=false` on deactivation |
| Refreshing grants after bind/unbind/complete | ✘ (deliberately — `GetFreerounds` is heavy) | `refresh()` on every panel open |
| Deferring the completed summary until the in-flight bet | ✔ (`finalizeExhaustedFreeround`) | modal + `acknowledgeCompleted()` |
| Credited modal dedup | ✘ | localStorage `skin:seenFreeroundGrants:<sessionToken>` |
| `NO_BOUND_GRANT` / `GRANT_EXPIRED` error | ✔ `freeround-state null` + `GetFreerounds` (`connection/ConnectionManager.ts:608-612`) | — |

## States and edge cases

- **Rows and Start are blocked** if `hasActiveBets || hasPendingBet || isSending (both slots) || any autoplay is active`. Tooltip: autoplay → "Stop Autoplay to change Free Bet.", otherwise → "Finish or cancel your bet to change Free Bet." UI policy — the SDK does not block bind.
- **Start disabled** additionally if `selectedGrantId === null` (real money is selected and nothing is active).
- **Deactivate** — only when the selected grant === the active one; the modal stays open. Switch/Start → `onClose()`.
- **Read the kind from `FreeroundState`, not from `grants`.** The server returns only AVAILABLE grants in `GetFreeroundsOk`, and when the balance drops to 0 the IN_PROGRESS grant may disappear from the list while the SDK is waiting for the last in-flight bet (the `finalizeExhaustedFreeround` deferred window). `FreeroundState` is stable in this window (`types/events.ts:160-167`), whereas `grants.find(...)` would return `undefined` and the panel would drop out of freebet mode prematurely.
- **Side-menu icon** is visible if `grants.length > 0 || isActive || !!lastCompleted`; the badge count only for the active one: range → `balanceRemaining`, fixed → `floor(balanceRemaining / betAmount + 1e-9)` (use the same formula in the badge and in the picker).
- **Credited modal** opens when an AVAILABLE grant appears in `grants` that is not in the seen list; the one closest to expiry is chosen; **all** AVAILABLE grants are marked seen at once (to avoid a cascade); if another info popup is open — skip (seen is still written). Count from `balanceInitial` (fixed: `floor(balanceInitial / betAmount + 1e-9)`, range: `balanceInitial`); `count || 1` fallback. Expiry: `expiresAt` missing/invalid → `7 d / 0 h / 0 m`.
- **Completed modal** — `lastCompleted` truthy → `InfoPopupTypes.FREE_BET_COMPLETED`; shows `totalWin` and `reason`; `EXPIRED` and `CANCELLED` share one "expired" copy. **Any close → `acknowledgeCompleted()`**.
- **Reconnect** — on JoinCrashOk `freeround-state` arrives again (the bound grant is kept on the server), `GetFreerounds` is sent automatically.
- **Page refresh** — the seen list is namespaced by session token; keys of other tokens are deleted by `gcOtherSeenKeys`.
- **Frozen** — does not affect the freebet logic.

## Reference implementation

The reference implementation splits this feature like so: a picker component (sort, refresh-on-open, archive, switch sequencing, Start/Deactivate, blocked reasons), a row component (`type: 'real-money' | 'bet-type' | 'archive'`; date via `roundItem.months`), the content of the credited / completed modals, a headless trigger component (credited dedup + open, `lastCompleted` → completed modal), the modal wiring (`freshGrant`, count, expiry cascade, Play now → `bind`, close → `acknowledgeCompleted`), the side-menu (icon visibility + badge), navigation state (`handleFreeBetClick` — mobile popup / desktop sidebar) and the adapter hook over the SDK (slot lock, range clamp, `minCashoutGate`, override multiplier).

### Switch-while-active (UI policy)

Reference implementation — the picker's switch sequencing:
```
const pendingBindRef = useRef<string | null>(null);

useEffect(() => {
  if (!isActive && pendingBindRef.current) {
    const target = pendingBindRef.current;
    pendingBindRef.current = null;
    bind(target);                       // after UnbindFreeroundOk
  } else if (!isActive && wasActive) {
    setSelectedGrantId(null);           // clean deactivation → real money
  }
}, [isActive, bind]);

// handleStart, active and a different grant is selected:
pendingBindRef.current = selectedGrantId;
unbind();
onClose();

```

### X/Y badge (UI policy)

Reference implementation — the badge formula:
```
if (g.kind === 'range') {
  balanceLabel = `${formatBalance(balanceRemaining)}/${formatBalance(balanceInitial)}`;
} else {
  const numer = g.betAmount > 0 ? Math.floor(balanceRemaining / g.betAmount + 1e-9) : 0;
  const denom = g.betAmount > 0 ? Math.floor(balanceInitial / g.betAmount + 1e-9) : 0;
  balanceLabel = `${numer}/${denom}`;
}

```

`+ 1e-9` because of IEEE-754 (`0.7 / 0.1 === 6.999…`). For the active grant `balanceRemaining`/`balanceInitial`/`roundsPlayed` are read from `state`, for the others from `g`.

### Slot lock (UI policy)

Reference implementation — the slot lock in the adapter hook:
```
const remainingFreebets = isFreeBetActive && freeBetAmount > 0 && freeroundState
  ? Math.floor(freeroundState.balanceRemaining / freeBetAmount)
  : Infinity;
const localFreebetReservation = (s: typeof slot1Snap): number =>
  (s.hasPendingBet || s.isSending) ? 1 : 0;
const effectiveRemaining = remainingFreebets - slot1Reservation - slot2Reservation;

const isSlotFreeForNewBet = (s: typeof slot1Snap): boolean =>
  !s.hasPendingBet && !s.isSending
  && (!s.bet || s.bet.state === BetState.Won || s.bet.state === BetState.Lost);

const slot1Locked = isFreeBetActive && slot === BetSlot.Slot1
  && thisSlotFree && effectiveRemaining < 1;
const slot2Locked = isFreeBetActive && slot === BetSlot.Slot2
  && thisSlotFree
  && (effectiveRemaining < 1
      || (effectiveRemaining < 2 && slot1Reservation === 0 && slot1FreeForNewBet));

```

Reservation = a locally "reserved" free bet that the server has not yet deducted from the balance (pending/isSending). The lock only disables the button (`buttonDisabled`), not the panel inputs. On a range grant `freeBetAmount = betMin`, so the count is computed with `betMin` in range mode as well.

### Credited modal trigger (UI policy)

Reference implementation — the headless trigger (`nav` — the app's own popup/sidebar state, `NavigationProvider`):
```
const availableGrants = grants
  .filter(g => g.status === 'AVAILABLE')
  .sort((a, b) => expiryMs(a) - expiryMs(b));
const fresh = availableGrants.find(g => !seen.has(g.grantId));
if (!fresh) return;
for (const g of availableGrants) seen.add(g.grantId);   // all at once
persistSeenIds(sessionToken, seen);
if (nav.infoPopupType === null) {
  nav.setInfoPopupType(InfoPopupTypes.FREE_BET_BONUS);
}

```

### Completed modal close

Reference implementation — closing the modal:
```
const handleClose = () => {
  if (nav.infoPopupType === InfoPopupTypes.FREE_BET_COMPLETED) {
    acknowledgeCompleted();   // CRITICAL — store.lastFreeroundSummary = null
  }
  nav.setInfoPopupType(null);
};

```

## Minimal example (React + Vite)

```
import { useEffect, useState } from 'react';
import { useFreerounds, useHasActiveBets, useAutoPlay, BetSlot } from '@krash/react';

export function FreeBetPicker({ onClose }: { onClose: () => void }) {
  const { state, isActive, grants, lastCompleted, bind, unbind, refresh, acknowledgeCompleted } = useFreerounds();
  const hasActiveBets = useHasActiveBets();
  const ap1 = useAutoPlay(BetSlot.Slot1);
  const ap2 = useAutoPlay(BetSlot.Slot2);
  const blocked = hasActiveBets || ap1.isActive || ap2.isActive;

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (isActive && state) setSelected(state.grantId); }, [isActive, state?.grantId]);

  const sorted = [...grants].sort((a, b) =>
    (a.expiresAt ? Date.parse(a.expiresAt) : Infinity) - (b.expiresAt ? Date.parse(b.expiresAt) : Infinity));
  const selectedIsActive = isActive && selected === state?.grantId;

  const start = () => {
    if (blocked) return;
    if (selectedIsActive) { unbind(); return; }
    if (selected) { bind(selected); onClose(); }
  };

  return (
    <div>
      <label>
        <input type="radio" checked={selected === null} disabled={blocked} onChange={() => setSelected(null)} />
        Play with real money
      </label>
      {sorted.map(g => {
        const bal = g.grantId === state?.grantId && state ? state.balanceRemaining : g.balanceRemaining;
        const init = g.grantId === state?.grantId && state ? state.balanceInitial : g.balanceInitial;
        const badge = g.kind === 'range'
          ? `${bal}/${init}`
          : `${Math.floor(bal / g.betAmount + 1e-9)}/${Math.floor(init / g.betAmount + 1e-9)}`;
        return (
          <label key={g.grantId}>
            <input type="radio" checked={selected === g.grantId} disabled={blocked} onChange={() => setSelected(g.grantId)} />
            {g.kind} · {badge} · min {g.minCashout}x
          </label>
        );
      })}
      <button disabled={!selected || blocked} onClick={start}>
        {selectedIsActive ? 'Deactivate' : 'Start'}
      </button>

      {lastCompleted && (
        <div role="dialog" onClick={acknowledgeCompleted}>
          {lastCompleted.reason === 'EXPIRED' || lastCompleted.reason === 'CANCELLED' ? 'Free bet expired' : 'Free bet finished'}
          — won {lastCompleted.totalWin.toFixed(2)}
        </div>
      )}
    </div>
  );
}

```

## Common mistakes

- Closing the completed modal without `acknowledgeCompleted()` — `lastCompleted` stays non-null, the modal reopens on every mount and the next summary for the same grant is lost to dedupe.
- Getting kind/betMin/betMax via `grants.find(g => g.grantId === state.grantId)` — in the deferred window of the last free bet the grant is no longer in the list; read it from `state`.
- Expecting an IN_PROGRESS status in `grants` after bind — the server returns only AVAILABLE grants; the live state of the active grant is in `state`.
- Expecting the range clamp / `minCashout` cashout gate from the SDK — both are UI policy (skin responsibility); the SDK only enforces the fixed `betAmount`.
- Showing the credited modal separately for each grant — Play now/close is followed by a second modal; mark all AVAILABLE grants at once.
- Assuming `expiresAt` always exists — on a legacy backend it is `undefined`; the reference implementation uses a 7-day fallback and puts it at the end of the sort.

