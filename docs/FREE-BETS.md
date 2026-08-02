# Free bets

A grant is a book of tickets: a fixed stake, a count, and rules for how a win
pays out. Staking one replaces the wallet for as long as it lasts.

---

## The model

`game/freeBets.ts`

```ts
interface FreeBetGrant {
  id: string;
  payout: FreeBetPayout;   // FullPayout | PureProfit | BonusBalance
  typeKey: TranslationKey; // the flavour shown in the grants list
  price?: number;          // stake per bet — absent means it can't be staked
  amount?: number;         // lump sum, for grants that carry one instead
  currency: string;
  total: number;           // tickets granted
  used: number;            // tickets spent
  minCashout: number;      // shown as MIN.WITHDRAWAL; informational today
  accruedAt: string;
  expiresAt: string;
}
```

Two helpers carry the rules that matter: `remainingOf(grant)` is
`total - used`, and `isStakeable(grant)` is `price != null && remaining > 0`.

### Payout flavours

| Flavour        | On cash-out at `m`         | Notes                                        |
| -------------- | -------------------------- | -------------------------------------------- |
| `FullPayout`   | `stake × m` credited       | settles like a real bet                       |
| `PureProfit`   | `stake × (m − 1)` credited | the stake was never the player's to get back  |
| `BonusBalance` | —                          | a pot, not tickets: **not stakeable** today   |

---

## The store

`game/freeBetStore.ts`, read through `useFreeBets` / `useActiveFreeBet` /
`useFreeBetsRemaining`.

- **One grant is staked at a time, and both slots share it.** It's a choice of
  wallet, not a per-slot setting.
- **Every session opens on real money.** The staked grant is not persisted;
  staking is always a deliberate act, never something a reload does for you.
- **Tickets are spent on placement, not settlement.** The store listens for
  `BetPlaced` and decrements; it listens for `CancelBetOk` and gives the ticket
  back. Cashing out changes nothing — the ticket was already spent.
- **An empty grant unstakes itself.** When the last ticket goes, `activeId`
  clears, so the bet area can't offer a bet it has no ticket for.

---

## What the engine does differently

`game/engine/crashEngine.ts` takes an optional `freeBetId` on `CmdPlaceBet`:

- No funds check and no debit — the wallet is untouched at placement.
- A queued pre-bet whose grant disappeared before the next round is **dropped**,
  not charged to the wallet.
- Cancelling refunds nothing to the balance (nothing was taken); the ticket
  comes back through `CancelBetOk`.
- Settlement reads the grant to pick the payout formula above.

The engine trusts the command about availability. The store and the bet area are
what stop you from spending a ticket you don't have — a real server would
re-check.

---

## What the player sees

| Surface                            | Behaviour                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Free Bet button over the stage     | total tickets across all stakeable grants; hidden at zero; opens the list   |
| Free bets modal (`ModalId.BetType`)| radio list — real money or a grant; picking one applies immediately         |
| Play Now                           | closes the modal; the choice was already applied                            |
| Bet area                           | gold frame, stake readout `0.5 USD` + `40/50`, presets off, gold Bet button |
| The readout                        | it's a button — tap it to get back to the grants list                       |
| Auto-play                          | spends a ticket per round; stops when the grant empties                     |

Auto-play stopping matters: without it the next round would quietly reach for
the player's own money.

---

## What's mocked

`INITIAL_GRANTS` in `game/freeBets.ts` — three placeholder grants (two
stakeable, one bonus balance). There is no wallet API yet, so nothing refetches
and nothing expires: `expiresAt` and `accruedAt` are display strings, and
`minCashout` is shown but not enforced.

## Open questions

- **Bonus balance.** It has no per-bet price, so it can't drive a fixed stake.
  It's listed with its radio disabled. Should selecting it bet normally but draw
  from the bonus pot, or something else?
- **Minimum cash-out.** The Limits modal tells players a floor applies to free
  bets (~1.50×). Nothing enforces it — an earlier attempt used the mock's `3.5x`
  and made cashing out impossible in most rounds. If it should be real, it needs
  a realistic threshold and a clear disabled state on the button.
- **Expiry.** Nothing checks `expiresAt`. A grant that lapses mid-session stays
  stakeable until the page reloads.
