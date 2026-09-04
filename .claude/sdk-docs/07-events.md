<!-- source: https://krash-sdk-docs.playcore.live/en/07-events/ -->

# 7. Event System

## client.on() / client.off()

The SDK has a typed event system (`packages/sdk/src/core/EventEmitter.ts`). Besides React hooks, you can listen to events directly — in Phaser/Canvas/sound/analytics layers, where we do not want React's update cycle.
```
const client = useKrashClient();

const unsub = client.on('crash', ({ multiplier }) => {
  console.log(`Crashed at ${multiplier}x`);
});
unsub();                    // or client.off('crash', handler)

```

Emitter semantics that affect ordering:

- Listeners run **synchronously**, in registration order (`EventEmitter.ts:38-47`). The SDK's internal engines are registered in the `KrashClient` constructor — that is, always **before your listeners**. When you listen to `'tick'`, `GameEngine`'s `phase-change`/`crash` have already been emitted before your `'tick'` handler runs.
- There is no `try/catch`: if your listener throws an exception, the remaining listeners of the same event **will not run** and the exception propagates up into the `sfs2x-api` callback. Guard your handlers.
- `client.destroy()` removes all listeners. `KrashProvider` does this itself on unmount.
- Every event is type-safe via `GameEventMap` (`packages/sdk/src/types/events.ts:268-329`).

## Event Map (30 events)

Notation: CM = `packages/sdk/src/connection/ConnectionManager.ts`, GE = `packages/sdk/src/game/GameEngine.ts`, BE = `packages/sdk/src/betting/BettingEngine.ts`, AP = `packages/sdk/src/autoplay/AutoPlayEngine.ts`, KC = `packages/sdk/src/core/KrashClient.ts`.

### Game state

| Event | Payload | Emitted by | When |
| `tick` | `TickPayload` | CM:445 | the server's `Tick` in every phase; ~100 ms in FLYING. Phase changes are also read from here |
| `phase-change` | `{ phase: GamePhase; roundId: string }` | GE:91 | the tick's `phase` differs from the previous one |
| `crash` | `{ multiplier: number }` | GE:95 | after `phase-change` → CRASHED, in the same tick |
| `crash-history-item` | `{ roundId; crashAt; fairnessHash?; serverSeed?; timestamp }` | GE:96 | after `crash`, in the same tick |
| `game-frozen` | `{ frozen: boolean }` | GE:36 | no tick arrived for 2000 ms after the first tick / it arrived again |
| `balance` | `{ balance: number }` | CM:417, 459, 469, 488, 511 | JoinCrashOk, BetPlaced, CashoutDone, CancelBetOk (if the `balance` field is present), `Balance` — response to the keep-alive `GetBalance` once every 5000 ms |
| `username` | `{ username: string }` | CM:326 | SFS `LOGIN`; again on reconnect. Persistence is bound here (KC:203) |
| `game-config` | `GameConfig` | CM:528 | `GameConfig` — response to `GetGameConfig` (sent on LOGIN, CM:317) |
| `currency-mode` | `{ mode: CurrencyMode }` | CM:414 | JoinCrashOk, on every (re)connect |

### Betting

| Event | Payload | Emitted by | When |
| `bet-placed` | `BetPlacedPayload` | CM:461 | the server's `BetPlaced` — the bet was confirmed. `slotIndex` = `BetSlot` (0/1), not the server's 1/2 |
| `cashout-done` | `CashoutDonePayload` | CM:471 | the server's `CashoutDone` — manual or server-side auto-cashout |
| `cancel-bet-ok` | `CancelBetOkPayload` | CM:490 | the server's `CancelBetOk` |
| `bet-update` | `BetUpdatePayload` | CM:478, 517 | `BetUpdateBroadcast` (another player's bet/cashout); on the `RoundBets` response one per bet |
| `round-my-bets` | `RoundMyBetsPayload` | CM:523 | `RoundMyBets` — response to `GetRoundMyBets` (sent on ROOM_JOIN, CM:350) |
| `bet-error` | `{ slotIndex: number; error: string }` | CM:603 | the server's `Error` with a `slot` field. **Not wired into slot state** — `isSending` is cleared by the 5000 ms timeout, `betFailed` is not set |
| `missed-round-bets` | `{ bets: Array<{ slotIndex; amount; state }> }` | BE:305 | on BETTING_OPEN a slot still has a Placed/Active bet (CRASHED was missed — reconnect) |
| `slot-state-change` | `{ slot: BetSlot; state: SlotSnapshot }` | **nobody** | declared in `GameEventMap`, never emitted anywhere in the code. Get slot changes through the store (`useBetting`) |

### History

| Event | Payload | Emitted by | When |
| `game-history` | `GameHistoryItem[]` | CM:504 | `History` — response to `GetHistory` (automatically on JoinCrashOk, CM:438; `client.getHistory()`) |
| `my-history` | `MyHistoryPayload` | CM:496 | `MyHistory` — response to `GetMyHistory` (on ROOM_JOIN, CM:351; `client.getMyHistory()`) |

### Free Rounds — details in 11-freerounds.md

| Event | Payload | Emitted by | When |
| `freeround-state` | `FreeroundState \| null` | CM:422/437, 536, 557, 611; BE:407, 637, 736 | JoinCrashOk (grant or `null`), BindFreeroundOk, UnbindFreeroundOk (`null`), `Error` `NO_BOUND_GRANT`/`GRANT_EXPIRED` (`null`); BetPlaced `freeround_completed=true` (updated state), grant finalisation (`null`), balance restore on CancelBetOk |
| `freeround-list` | `{ grants: FreeroundGrant[] }` | CM:566 | `GetFreeroundsOk` — automatically on JoinCrashOk (CM:441), `client.getFreerounds()`, on a `GRANT_EXPIRED` error. The server returns only AVAILABLE ones |
| `freeround-history` | `FreeroundHistoryPayload` | CM:573 | `GetFreeroundHistoryOk` — `client.getFreeroundHistory()` |
| `freeround-completed` | `{ grantId: string }` | BE:408 | BetPlaced `freeround_completed=true` — a **UX hint**; `KrashClient` stops autoplay (KC:171). **Never** on EXPIRED/CANCELLED |
| `freeround-summary` | `FreeroundSummaryPayload` | CM:588 | the server's `FreeroundCompleted` push — the **authoritative** `totalWin`. The event is emitted immediately; the store's `lastFreeroundSummary` may be deferred (see below) |

### Connection

| Event | Payload | Emitted by | When |
| `connection-change` | `{ state: ConnectionState }` | CM:224, 278, 305, 318, 359, 387, 629, 635 | `'disconnected'`: start of the first connect, CONNECTION fail, CONNECTION_LOST, every reconnect attempt, limit exhausted. `'connected'`: socket CONNECTION **and** JoinCrashOk (twice). `'checking'`: after LOGIN, before JoinCrashOk |
| `server-connected` | `undefined` | CM:279 | socket CONNECTION success — before login |
| `session-expired` | `undefined` | CM:298, 345, 373; KC:265 | login timeout (10000 ms), LOGIN_ERROR, CONNECTION_LOST while waiting for login, demo relaunch failure. On a demo session one relaunch is attempted first |
| `ping-pong` | `{ lagValue: number }` | CM:355 | SFS lag monitor (`enableLagMonitor(true, 4, 5)`, CM:320) |
| `error` | `{ message: string }` | CM:598 | the server's `Error` extension response (wire: `error`) |

### Auto-play

| Event | Payload | Emitted by | When |
| `autoplay-stop` | `{ slot: BetSlot; reason: AutoPlayStopReason }` | AP:126 | `engine.stop(reason)` — for an active engine. `reset()` does not emit. Reasons — 05-autoplay |

## Payload interfaces

From `packages/sdk/src/types/events.ts`, verbatim. Wire field names in the comments (`SfsProtocol.ts`).
```
export type CurrencyMode = 'single' | 'multi';

/** Server tick — arrives every ~100ms in the FLYING phase. */
export interface TickPayload {
  multiplier: number;      // wire: multiplier
  phase: string;           // wire: phase — 'BETTING_OPEN' | 'BETTING_CLOSING' | 'FLYING' | 'CRASHED'
  roundId: string;         // wire: roundId ('' if absent)
  remainingMs: number;     // wire: remainingMs (0 if absent)
  /** Fairness hash — arrives in the CRASHED tick. */
  fairnessHash?: string;
  /** Server seed — arrives in the CRASHED tick. */
  serverSeed?: string;
}

/** The bet was confirmed on the server. */
export interface BetPlacedPayload {
  slotIndex: number;       // wire: slot (1/2) → BetSlot (0/1)
  amount: number;
  currency: string;
  betId: string;
  balance?: number;
  /** Freeround grant ID — if the bet was placed with a freeround. */
  freeroundGrantId?: string;            // wire: freeround_grant_id
  /** Remaining freeround balance. */
  freeroundBalanceRemaining?: number;   // wire: freeround_balance_remaining
  /** The freeround was completed by this bet. */
  freeroundCompleted?: boolean;         // wire: freeround_completed
}

/** Cashout completed successfully. */
export interface CashoutDonePayload {
  slotIndex: number;       // wire: slot → BetSlot
  multiplier: number;
  payout: number;
  betAmount: number;       // wire: betAmount (fallback: payout / multiplier)
  balance?: number;
  /** Freeround grant ID — set when the cashed-out bet was a freebet. */
  freeroundGrantId?: string;            // wire: freeround_grant_id
  /** "BET" or "FREEBET"; absent on legacy backends. */
  betType?: string;
  /** Freeround mode: "ZERO_BET" or "BET_FROM_WIN". Absent for cash bets and on legacy backends. */
  betMode?: string;
}

/** Bet cancellation completed successfully. */
export interface CancelBetOkPayload {
  slotIndex: number;       // wire: slot → BetSlot
  betId: string;
  balance?: number;
  /** Freeround grant ID — if the bet was placed with a freeround and the server returns it. */
  freeroundGrantId?: string;            // wire: freeround_grant_id
  /** Updated freeround balance (after the refund). If it does not arrive,
   * the SDK uses an optimistic local restore and refreshes the grants list. */
  freeroundBalanceRemaining?: number;   // wire: freeround_balance_remaining
}

/** Another player's bet update (broadcast). */
export interface BetUpdatePayload {
  betId: string;
  amount: number;
  currency: string;        // when absent, the session/game-config currency
  status: string;          // default 'ACTIVE'
  username: string;
  fakeIdentifier: string;
  userId?: number;
  slot?: number;           // the server's 1/2 — not converted here
  cashedOutAt?: number;
  payout?: number;
  autoCashoutAt?: number;
  roundId?: string;
}

/** The player's bets in the current round. */
export interface RoundMyBetsPayload {
  roundId: string;
  bets: Array<{
    slotIndex: number;     // wire: slot → BetSlot
    amount: number;
    status: string;        // 'PLACED' | 'ACTIVE' | 'CASHED_OUT' | ...
    /** Freeround grant ID — if the bet was placed with a freeround (also in the reconnect case). */
    freeroundGrantId?: string;          // wire: freeround_grant_id or freeroundGrantId
    cashedOutAt?: number;
    payout?: number;
  }>;
}

export type FreeroundStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

/** Freeround grant — available or in progress. */
export interface FreeroundGrant {
  grantId: string;                      // wire: freeround_grant_id
  status: FreeroundStatus;              // wire: freeround_status
  balanceRemaining: number;             // wire: freeround_balance_remaining
  balanceInitial: number;               // wire: freeround_balance_initial
  roundsPlayed: number;                 // wire: freeround_rounds_played
  kind: 'fixed' | 'range';              // from freeround_bet_config
  betAmount: number;
  betMin: number;
  betMax: number;
  minCashout: number;                   // default 1.01 (DEFAULT_MIN_CASHOUT), the comment in the file says 1.5 — outdated
  expiresAt?: string;
  accruedAt?: string;
  betConfigRaw?: string;                // wire: freeround_bet_config (JSON)
}

/** Freeround state — active grant (store slice). */
export interface FreeroundState {
  grantId: string;
  status: FreeroundStatus;
  balanceRemaining: number;
  balanceInitial: number;
  roundsPlayed: number;
  betAmount: number;
  minCashout: number;
  isActive: boolean;                    // status === 'IN_PROGRESS'
  kind: 'fixed' | 'range';
  betMin: number;
  betMax: number;
}

export interface FreeroundHistoryEntry {
  grantId: string;                      // wire: grant_id
  status: 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  kind: 'fixed' | 'range';              // wire: bet_mode === 'BET_RANGE' → range
  totalWin: number;                     // wire: total_win
  roundsPlayed: number;                 // wire: rounds_played
  freeRoundBalance: number;             // wire: free_round_balance
  completedAt: string;                  // wire: completed_at
  expiryDate?: string;
  minCashout?: number;                  // wire: min_cashout_coeff
}

export interface FreeroundHistoryPayload {
  entries: FreeroundHistoryEntry[];
  page: number;                         // wire: page
  pageSize: number;                     // wire: page_size
  totalItems: number;                   // wire: total_items
}

/** Final freeround summary — the server's `FreeroundCompleted` push event. */
export interface FreeroundSummaryPayload {
  grantId: string;                      // wire: grant_id
  roundsPlayed: number;                 // wire: rounds_played
  balanceUsed: number;                  // wire: balance_used
  balanceRemaining: number;             // wire: balance_remaining — may be > 0 on EXPIRED
  totalWin: number;                     // wire: total_win
  /** 'COMPLETED' — normal; 'EXPIRED' — TTL; 'CANCELLED' — admin. An old server does not send it → 'COMPLETED'. */
  reason?: 'COMPLETED' | 'EXPIRED' | 'CANCELLED';   // wire: reason
}

/** Game history item (crash multipliers). */
export interface GameHistoryItem {
  roundId: string;
  crashAt: number;
  fairnessHash: string;
  serverSeed: string;
  startTimeMs: number;
}

/** The player's bet history. */
export interface MyHistoryPayload {
  rounds: Array<{
    roundId: string;                    // `${roundId}-ticket-${j}` — each ticket separately
    timestamp: string;                  // wire: ticket.createdAt
    totalBet: number;                   // wire: ticket.betAmount
    totalWin: number;                   // wire: ticket.winAmount
    crashMultiplier: number;            // wire: round.crashMultiplier
    bets: Array<{                       // always 1 element
      betType: string;                  // 'freebet' | 'classic'
      multiplier: number;               // winAmount / betAmount (0 if not won)
      betAmount: number;
      netCash: number;                  // === winAmount
      slot?: number;                    // wire: ticket.slot (1/2)
    }>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

```

`GameConfig` — 06-hooks-reference.

## Event Ordering

In every diagram an arrow = a synchronous sequence while processing one extension response; `⋯` = a separate network response whose order is not guaranteed.

### Connect → JoinCrashOk

```
client.launch()
  connection-change { disconnected }          CM:224 (only on the first connect)
SFS CONNECTION (success)
  connection-change { connected }             CM:278  ← only the socket so far
  server-connected                            CM:279
  → LoginRequest('session_token', …)
SFS LOGIN
  → JoinCrash, GetGameConfig                  CM:316-317
  connection-change { checking }              CM:318
  username { username }                       CM:326  → persistence bind + hydrate (KC:203-213)
SFS ROOM_JOIN (the server joins us)
  → GetRoundBets, GetRoundMyBets, GetMyHistory  CM:349-351
JoinCrashOk
  connection-change { connected }             CM:387  ← now actually ready for the game
  currency-mode { mode }                      CM:414
  balance { balance }                         CM:417  (if the field is present)
  freeround-state (grant | null)              CM:422 / 437
  → GetHistory, GetFreerounds                 CM:438-441
⋯ game-config          (response to GetGameConfig)
⋯ bet-update × N       (RoundBets)
⋯ round-my-bets        (RoundMyBets)
⋯ my-history           (MyHistory)
⋯ game-history         (History)
⋯ freeround-list       (GetFreeroundsOk)
⋯ tick …               (phase-change right at the first tick, if it differs from the default BETTING_OPEN)

```

`'connected'` arrives **twice**. "Ready" = the `'connected'` that was preceded by `'checking'`; or simply `'username'` + the first `'tick'`. The reference implementation's loader waits for three gates (server-connected, authenticated, assets) — see 14-reference-implementation.

### Round lifecycle

```
Tick { phase: BETTING_OPEN }
  [GE] store { phase, roundId, multiplier: 1, crashedAt: null }
  phase-change { BETTING_OPEN, roundId }      GE:91
    [BE]  missed-round-bets (if a Placed/Active bet remained)   BE:305
    [BE]  bet=null in both slots, winAmount=null, pending bets are sent (PlaceBet)
    [KC]  autoplay onNewRound() → placeBet (if active)
  tick                                        (your listener — after phase-change)
Tick { phase: BETTING_CLOSING }
  phase-change { BETTING_CLOSING }            buttons disabled
  tick
Tick { phase: FLYING }
  phase-change { FLYING }
    [BE]  Placed → Active; isSending && !bet → betFailed=true (3000 ms)
  tick { multiplier } × N                     ~100 ms; store.multiplier on each one
Tick { phase: CRASHED, fairnessHash, serverSeed }
  phase-change { CRASHED, roundId }           GE:91
    [BE]  Active/Placed → Lost
    [KC]  autoplay onRoundComplete()
  crash { multiplier }                        GE:95
  crash-history-item { … }                    GE:96
  tick

```

`roundId` is updated both on BETTING_OPEN and on CRASHED (GE:80-82). The duration of `BETTING_OPEN` is the server's — listen to `tick.remainingMs`.

### Placing a bet

```
client.placeBet(slot, amount, { autoCashoutAt? })
  [BE] BETTING_OPEN && !bet && !pending → isSending=true, PlaceBet →, timeout 5000 ms
       otherwise → pendingBet (will be sent on the next BETTING_OPEN); no event
  store: slot { isSending, buttonVariant: Cancel (disabled) }
BetPlaced
  balance { balance }                         CM:459 (if the field is present)
  bet-placed { slotIndex, betId, amount, … }  CM:461
    [BE]  bet { state: Placed | Active (if FLYING) }, isSending=false, pending=null
    [BE]  freebet: freeround-state (+ freeround-completed, if it was the last one)
    [KC]  autoplay onBetConfirmed()
  (your listener)

```

In the case of rejection: `error { message }` (+ `bet-error { slotIndex, error }` if the `slot` field is present) — the slot stays in `isSending` until the timeout (5000 ms), or on FLYING becomes `betFailed=true`. `bet-placed` does not arrive.

### Cashout

```
client.cashout(slot)                          only bet.state === Active
  [BE] isCashingOut=true, timeout 3000 ms → store: CashingOut (disabled)
  Cashout →
CashoutDone
  balance { balance }                         CM:469
  cashout-done { slotIndex, multiplier, payout, betAmount, betMode?, … }   CM:471
    [BE]  bet { state: Won, cashedOutAt, payout }, winAmount=payout, winTimestamp
    [BE]  freebet: finalizeExhaustedFreeround → possibly freeround-state null
    [KC]  autoplay onWin(profit); last round → autoplay-stop { COMPLETED }

```

Server-side auto-cashout (`autoCashoutAt > 1.0` in PlaceBet) sends the same `CashoutDone` without `client.cashout()` — there is no difference for the UI.

### Cancel

```
client.cancelBet(slot)
  pending bet     → removed locally; nothing on the server; no event; store sync
  Placed/Active   → isCancelling=true, timeout 3000 ms, CancelBet →
  Idle/Won/Lost   → nothing
CancelBetOk
  balance { balance }                         CM:488
  cancel-bet-ok { slotIndex, betId, freeroundGrantId?, freeroundBalanceRemaining? }   CM:490
    [BE]  bet=null, isCancelling=false
    [BE]  freebet: freeround-state (balance restore)   BE:736

```

### Reconnect

```
SFS CONNECTION_LOST
  connection-change { disconnected }          CM:359
  attemptReconnect: connection-change { disconnected }   CM:635 (on every attempt)
  delay = min(1000 × 2^(n−1), 30000), max 100 attempts → at the limit connection-change { disconnected } CM:629
doConnect (isReconnecting → 'disconnected' is no longer emitted)
  CONNECTION → connection-change { connected }, server-connected
  LOGIN → connection-change { checking }, username (again; persistence key is the same → hydrate is not repeated)
  ROOM_JOIN → GetRoundBets / GetRoundMyBets / GetMyHistory
  JoinCrashOk → connected, currency-mode, balance, freeround-state, …
⋯ round-my-bets → [BE] bets are restored with id: '' (PLACED/ACTIVE/CASHED_OUT)   BE:752-781
⋯ next BETTING_OPEN → missed-round-bets, if a restored bet has not finished

```

Reconnect happens **only** on `CONNECTION_LOST`. A drop while waiting for login → `session-expired` (on demo, one relaunch first).

### Free bet completion

```
BetPlaced { freeround_completed: true }       the last freebet was confirmed
  balance?                                    CM:459
  bet-placed                                  CM:461
    [BE]  freeround-state { balanceRemaining: 0, roundsPlayed+1 }   BE:407  (isActive still true)
    [BE]  freeround-completed { grantId }     BE:408
      [KC]  autoplay-stop { FREEROUND_COMPLETED } on both active slots   KC:171-177
    [KC]  autoplay onBetConfirmed()
the bet is played …
cashout-done | phase-change { CRASHED } | cancel-bet-ok
  [BE] finalizeExhaustedFreeround → freeround-state null, the grant is removed from grants   BE:636-641
       (+ store.lastFreeroundSummary, if the summary had already arrived)
FreeroundCompleted push  — timing: before bet-placed, in between, or after the last round
  freeround-summary { totalWin, reason? }     CM:588 — the event is always immediate
    [BE]  an in-flight freebet exists → payload stash (last one wins); store later, on finalize
    [BE]  no in-flight → store.lastFreeroundSummary + finalize(force)

```

Important:

- `'freeround-summary'` **may arrive before `'freeround-completed'`** (the server sometimes sends an "early" push with `totalWin=0`, and then a second one). So build the completed modal on `useFreerounds().lastCompleted` (a store slice, deferred and deduped), not directly on the event. `acknowledgeCompleted()` is mandatory — without it the next summary for the same grant is ignored (BE:446-450).
- **`EXPIRED`/`CANCELLED`:** only `'freeround-summary'` (with the `reason` field) → store immediately → `'freeround-state' null`. `'freeround-completed'` does **not** arrive, so the SDK does **not** stop autoplay — the UI must do that when `isActive` transitions to `false` (the reference implementation does it this way).
- On `'freeround-state'` `null` the grant's data disappears from `state`; for a badge take the last value from `'freeround-summary'`.

## Which events for which layer

### Phaser / Canvas

| Goal | Event | Note |
| scene phase (idle → fly → crash) | `phase-change` | the reference implementation's scene consumes only this; on CRASHED spine `Win` + red overlay |
| multiplier counter | `tick` (`multiplier`, `remainingMs`) | `useMultiplier` via React — no; the reference implementation's scene does not consume ticks (the counter is in React) |
| crash animation | `crash` | after `phase-change CRASHED`, in the same tick |
| BETTING_OPEN countdown | `tick.remainingMs` | server-driven; the duration is not in the SDK |
| freeze overlay | `game-frozen` | or store `isGameFrozen` |

The reference implementation forwards these events through a bridge component onto an EventBus (the app's local `Phaser.Events.EventEmitter`) (under `sfs:*` names; `sfs:crash-state {crashed}` + 100 ms reset), so that Phaser is independent of React. If you hand Phaser the `client` directly, you do not need the bridge.

### Sound

| Sound | Event / source |
| wait-phase loop | `phase-change` → BETTING_OPEN start, FLYING stop |
| fly music | `tick` — `phase === FLYING && multiplier > 1.0` (reference implementation) |
| crash | `phase-change` → CRASHED or `crash` |
| cashout / win | `cashout-done` (payout, multiplier) |
| autoplay stop | `autoplay-stop` |
| clicks (bet, cancel, toggle) | not an event — in handlers (reference implementation: `playSound()` — the app's sound helper — in the betting adapter hook's onBet/onCancel) |

The reference implementation's sound hook listens only to `'tick'` and computes the phase change itself; `phase-change` directly is simpler.

### Analytics / logging

| What | Event |
| bet placed / cashout / cancel | `bet-placed`, `cashout-done`, `cancel-bet-ok` (+ `bet-error`, `error` on rejections) |
| round result | `crash-history-item` (roundId, crashAt, fairness) |
| autoplay session | `autoplay-stop` (reason) — there is no start event; log around the hook's `start()` |
| freebet settlement | `freeround-summary` (totalWin, reason) |
| connectivity | `connection-change`, `session-expired`, `ping-pong` (lag) |
| identity | `username` (SFS name), `useKrashState().session` (gameId, currency, mode) |

## Events vs Hooks

| Usage | Events (`client.on`) | Hooks |
| Phaser/Canvas, sound, analytics | ✅ | — |
| React UI (balance, buttons, phase) | — | ✅ |
| completed modal on a free bet | — | ✅ `useFreerounds().lastCompleted` (deferred/dedupe) |
| toast on `autoplay-stop` | ✅ | — |
| other players' bet feed | ✅ `bet-update` (not stored in the store) | — |
| game history list | ✅ `game-history` + `crash-history-item` | `useGameHistory` (has no cache) |

## In Vanilla JS

```
import { KrashClient } from '@krash/sdk';
import * as SFS2X from 'sfs2x-api';

const client = new KrashClient({ apiBaseUrl: '…', sfsHost: '…', gameId: 'your-game-id' });

client.on('phase-change', ({ phase, roundId }) => { /* … */ });
client.on('crash', ({ multiplier }) => { /* … */ });
client.on('connection-change', ({ state }) => { /* … */ });

await client.launch(SFS2X);

// unmount
client.destroy();   // all listeners are removed, autoplay reset, the socket is closed

```

