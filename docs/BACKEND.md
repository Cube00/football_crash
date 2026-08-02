# Wiring up a real backend

The app is built around a seam. Everything the UI knows arrives as an event on
the bus; a local engine produces those events today. Swapping in a server means
producing the same events from a socket and deleting the engine — no component,
hook or store should have to change.

---

## What gets replaced

| Delete / replace                | Becomes                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `game/engine/crashEngine.ts`    | a socket handler that emits `engine:*` and consumes `cmd:*`    |
| `game/engine/fakeBets.ts`       | the server's broadcast of other players' bets                  |
| `game/engine/crashHistory.ts`   | the seed history the server sends on join                      |
| `game/config.ts` (`GAME_CONFIG`)| the server's game-config payload                               |

What stays untouched: `EventBus`, `events.ts`, `store.ts`, `freeBetStore.ts`,
every hook, every component, the Phaser scene.

---

## The contract

### Commands the UI sends

| Event             | Payload                                                        |
| ----------------- | -------------------------------------------------------------- |
| `cmd:place-bet`   | `{ slot, amount, currency, autoCashoutAt?, freeBetId? }`        |
| `cmd:cashout`     | `{ slot }`                                                      |
| `cmd:cancel-bet`  | `{ slot }`                                                      |

`slot` is `0 | 1` — the two independent bet panels. `autoCashoutAt` means the
server should settle the bet itself when the multiplier reaches it.

### Events the UI expects

| Event                          | Payload                                                                            | Drives                                  |
| ------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------- |
| `engine:tick`                  | `{ multiplier, phase, roundId, remainingMs }`                                        | the big number, the betting countdown   |
| `game-phase-change`            | `GamePhase`                                                                          | every phase-driven UI **and the canvas** |
| `engine:phase-reset`           | —                                                                                    | clears both slots for a fresh round     |
| `engine:new-betting-round`     | —                                                                                    | the point new bets start arriving       |
| `engine:crash-state`           | `{ crashed, multiplier? }`                                                           | the crash flash and red multiplier      |
| `engine:crash-history-item`    | `{ id, roundId, multiplier }`                                                        | the history strip                       |
| `engine:balance`               | `{ balance }`                                                                        | the header                              |
| `engine:bet-placed`            | `{ slot, amount, currency, betId, balance, freeBetId? }`                             | ack; spends a free-bet ticket           |
| `engine:cashout-done`          | `{ slot, multiplier, payout, betAmount, balance, auto }`                             | the win notice, auto-play stop rules    |
| `engine:cancel-bet-ok`         | `{ slot, betId, balance, freeBetId? }`                                               | ack; returns a free-bet ticket          |
| `engine:bet-update`            | `{ betId, username, amount, currency, status, cashedOutAt?, payout?, slot?, own? }`   | the bets feed and per-slot state         |

Notes that will bite otherwise:

- **`bet-update` carries both your bets and everyone else's.** `own: true` plus
  a `slot` is what makes a row drive the bet area rather than just the list.
- **Phase order matters.** `phase-reset` is emitted *before*
  `game-phase-change(BETTING_OPEN)` so a pre-bet placed during the phase-change
  dispatch survives the reset.
- **Bet ids must be unique across rounds.** The feed keys rows by `betId` and
  spans rounds; a repeated id replaces an older row.
- **The canvas listens too.** `game-phase-change` and `engine:crash-state` drive
  the animation; if the socket connects mid-round, answer
  `request-phase-sync` with the current phase or the scene will sit in its idle
  stance.
- **`remainingMs` only matters in `BETTING_OPEN`** — it's the countdown bar.

### Phases

`BETTING_OPEN → BETTING_CLOSING → FLYING → CRASHED`, then round over. The UI
never infers a phase; it only reacts to being told.

---

## Everything still faked

Beyond the engine itself, these are placeholders a real integration replaces:

| Where                                            | What                                                  |
| ------------------------------------------------ | ------------------------------------------------------ |
| `game/freeBets.ts` → `INITIAL_GRANTS`            | the player's free bet grants — see [FREE-BETS.md](FREE-BETS.md) |
| `components/ui/BetsList/BetsList.constants.ts`   | `MOCK_MY_BETS`, `MOCK_BETS`, `MOCK_MY_BETS_SUMMARY` — the My Bets tab and the summary row are entirely static |
| `components/ui/StatsContent/`                    | `MOCK_MULTIPLIERS`, `MOCK_ROUNDS` — the Stats tab       |
| `components/ui/ArchiveContent/`                  | spent-grant history                                     |
| `components/ui/ProbablyFairContent/`             | `HIDDEN_STATE_ROWS` — round id, server key, hash        |
| `components/ui/PointDetailsContent/`             | seeds behind a history pill                             |

The **All bets** tab is real — it's the live `bet-update` feed. **My Bets** and
**Stats** are not.

---

## Provably fair

The UI has the surface but none of the substance: the hidden-state table is
hardcoded, and no seed or hash is ever verified. A real implementation needs the
server's commit (hash before the round) and reveal (server seed after), plus a
client-side check the player can run. Treat the current screen as a layout, not
an implementation.

---

## Free bet placement

`cmd:place-bet` already carries an optional `freeBetId`. A server owns the
truth: it should re-check the grant, refuse a bet whose stake doesn't match the
grant's price, and echo `freeBetId` back on `bet-placed` / `cancel-bet-ok` so
the store's ticket accounting stays in step.
