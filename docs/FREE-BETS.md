# Free bets

A grant is a **wallet**, not a book of tickets: a balance the server debits when
it accepts a bet. Binding one replaces the player's own money for as long as it
lasts, on both slots at once.

Almost everything here belongs to the SDK — the protocol, the grant state,
attaching the grant id to a bet, giving the balance back on a cancel, closing an
exhausted grant out and stopping auto-play so the next round cannot fall through
to real money. **The lifecycle is documented in
[`.claude/sdk-docs/11-freerounds.md`](../.claude/sdk-docs/11-freerounds.md)**,
and the betting panel's freebet mode in `panels/09-freebet.md`. Read those
before changing anything below; this file only covers what is left over for the
skin.

---

## The model, in the fields the skin reads

`useFreerounds()` gives `state` (the bound grant), `grants` (available ones),
`history`, and `lastCompleted` (the close-out that opens the modal).

| Field | Means |
| --- | --- |
| `kind` | `fixed` — every bet costs `betAmount`; `range` — the player picks between `betMin` and `betMax` |
| `balanceRemaining` / `balanceInitial` | the wallet now and when it was granted |
| `roundsPlayed` | confirmed bets so far |
| `minCashout` | the floor the server enforces on a cashout; default 1.01 |
| `isActive` | `status === 'IN_PROGRESS'` — bets carry the grant id while true |

Read all of it from `state`, never from `grants.find(...)`: the server returns
only *available* grants, so the bound one is often not in that list at all.

---

## What the skin owns

`game/freerounds.ts`, and nothing else:

- **The X/Y badge** — `floor(balanceRemaining / betAmount)` over
  `floor(balanceInitial / betAmount)`, both nudged by 1e-9 because `0.7 / 0.1`
  is `6.999…` in floating point. A count the UI keeps itself would drift on the
  first cancel.
- **The range clamp** — the SDK sends a range grant's amount *unchanged*, so the
  stake is clamped here to `[betMin, min(betMax, balanceRemaining)]` or the
  server rejects it.
- **The slot lock** — the server only debits when it accepts a bet, so a queued
  or in-flight bet has not been counted yet. Without subtracting those, two
  empty slots both look affordable when one bet is left.
- **The cashout floor** — `BetArea` holds the button while the multiplier is
  under `minCashout`. The SDK sends a cashout whenever it is asked to.
- **The `Freebet` button face** — `computeButtonVariant` never returns it; the
  panel substitutes it for `Bet` while a grant is bound.

---

## What the skin must not do

Count tickets. Spend or refund a balance. Decide when a grant is finished. Stop
auto-play when one ends. Persist any of it. Each of those is the SDK's, and each
was deleted from this project on purpose.

One case is worth knowing because it looks like a bug: after the last free bet
is confirmed the panel **stays** in freebet mode until that bet resolves. The
SDK holds the grant open on purpose, so a bet in flight is still settled against
it.
