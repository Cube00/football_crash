import { EventBus } from "../EventBus";
import { GameEvent } from "../events";
import type {
  CmdCancelBetPayload,
  CmdCashoutPayload,
  CmdPlaceBetPayload,
  TickPayload,
} from "../events";
import { BetSlot, BetState, GamePhase } from "../enums";
import { CRASH, CURVE, GAME_CONFIG, ROUND_TIMINGS } from "../config";
import { freeBetStore } from "../freeBetStore";
import { FreeBetPayout } from "../freeBets";

/**
 * Local "fake server" for the crash game.
 *
 * It owns the authoritative round loop and the player's balance, and drives
 * everything the UI/Phaser layers see by emitting {@link GameEvent} events over
 * the {@link EventBus} — the same events a real backend socket handler would
 * emit. It also listens for the UI's `cmd:*` commands (place / cashout / cancel)
 * and answers with the matching acks.
 *
 * Nothing outside this file computes the multiplier, the crash point, or the
 * balance; swapping in a real server means re-emitting these events from a
 * socket and deleting this engine.
 */

interface EngineBet {
  betId: string;
  amount: number;
  currency: string;
  autoCashoutAt?: number;
  state: BetState;
  /** Grant this bet was staked from, when it is a free bet. */
  freeBetId?: string;
}


const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

/** Standard crash-curve draw with a house edge and a small instant-bust chance. */
function generateCrashPoint(): number {
  if (Math.random() < CRASH.instantChance) return 1.0;
  const r = Math.random();
  const raw = CRASH.houseEdge / (1 - r);
  const capped = Math.min(raw, CRASH.maxCrash);
  return Math.max(1.01, Math.floor(capped * 100) / 100);
}

/** Exponential multiplier as a function of elapsed flying time (seconds). */
function multiplierAt(elapsedSec: number): number {
  return Math.exp(CURVE.growthRate * elapsedSec);
}

let roundCounter = 0;

export class CrashEngine {
  private phase: GamePhase = GamePhase.BettingOpen;
  private roundId = "";
  private balance = GAME_CONFIG.startingBalance;
  private multiplier = 1;
  private crashPoint = 1;
  private flyStart = 0;
  private phaseEndsAt = 0;
  private running = false;

  private readonly bets: Array<EngineBet | null> = [null, null];

  private rafId: number | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  private readonly boundPlaceBet = (p: CmdPlaceBetPayload) => this.placeBet(p);
  private readonly boundCashout = (p: CmdCashoutPayload) => this.cashout(p.slot);
  private readonly boundCancel = (p: CmdCancelBetPayload) => this.cancelBet(p.slot);
  private readonly boundPhaseSync = () => this.broadcastPhaseSync();

  // ── Lifecycle ──────────────────────────────────────────────

  start() {
    if (this.running) return;
    this.running = true;

    EventBus.on(GameEvent.CmdPlaceBet, this.boundPlaceBet);
    EventBus.on(GameEvent.CmdCashout, this.boundCashout);
    EventBus.on(GameEvent.CmdCancelBet, this.boundCancel);
    EventBus.on(GameEvent.RequestPhaseSync, this.boundPhaseSync);

    this.emitBalance();
    this.enterBettingOpen();
  }

  stop() {
    this.running = false;
    EventBus.off(GameEvent.CmdPlaceBet, this.boundPlaceBet);
    EventBus.off(GameEvent.CmdCashout, this.boundCashout);
    EventBus.off(GameEvent.CmdCancelBet, this.boundCancel);
    EventBus.off(GameEvent.RequestPhaseSync, this.boundPhaseSync);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.phaseTimer !== null) clearTimeout(this.phaseTimer);
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.rafId = null;
    this.phaseTimer = null;
    this.countdownTimer = null;
  }

  // ── Public reads (for synchronous access from hooks) ───────

  getPhase(): GamePhase {
    return this.phase;
  }

  getMultiplier(): number {
    return this.multiplier;
  }

  getBalance(): number {
    return this.balance;
  }

  // ── Phase machine ──────────────────────────────────────────

  private enterBettingOpen() {
    roundCounter += 1;
    this.roundId = `round-${roundCounter}`;
    this.phase = GamePhase.BettingOpen;
    this.multiplier = 1;
    this.crashPoint = generateCrashPoint();

    // Carry queued pre-bets into the new round; drop everything else.
    const queued: Array<EngineBet | null> = [
      this.bets[0]?.state === BetState.Queued ? this.bets[0] : null,
      this.bets[1]?.state === BetState.Queued ? this.bets[1] : null,
    ];
    this.bets[0] = null;
    this.bets[1] = null;

    this.phaseEndsAt = now() + ROUND_TIMINGS.bettingMs;
    EventBus.emit(GameEvent.PhaseReset);
    EventBus.emit(GameEvent.NewBettingRound);
    EventBus.emit(GameEvent.CrashState, { crashed: false });
    EventBus.emit(GameEvent.CurrentRound, { roundId: this.roundId });
    EventBus.emit(GameEvent.GamePhaseChange, this.phase);
    this.emitTick(this.phase, ROUND_TIMINGS.bettingMs);

    // Activate queued pre-bets now that a real betting window is open.
    for (let slot = 0; slot < queued.length; slot += 1) {
      const bet = queued[slot];
      if (bet) this.activateQueued(slot as BetSlot, bet);
    }

    // Repeated ticks so the betting countdown (remainingMs) animates.
    this.startCountdown();
    this.schedule(ROUND_TIMINGS.bettingMs, () => this.enterBettingClosing());
  }

  /** Turns a carried-over queued pre-bet into a real placed bet (or drops it). */
  private activateQueued(slot: BetSlot, bet: EngineBet) {
    const freeBet = bet.freeBetId
      ? freeBetStore.getGrant(bet.freeBetId)
      : undefined;

    if (bet.freeBetId && !freeBet) {
      // The grant ran out while the pre-bet waited — drop it rather than
      // silently charging the wallet for a bet the player meant to be free.
      this.bets[slot] = null;
      EventBus.emit(GameEvent.BetUpdate, {
        betId: bet.betId,
        username: "You",
        amount: bet.amount,
        currency: bet.currency,
        status: BetState.Idle,
        slot,
        own: true,
        freeBetId: bet.freeBetId,
      });
      return;
    }

    if (!freeBet && bet.amount > this.balance) {
      // Can't afford it any more — quietly drop it.
      this.bets[slot] = null;
      EventBus.emit(GameEvent.BetUpdate, {
        betId: bet.betId,
        username: "You",
        amount: bet.amount,
        currency: bet.currency,
        status: BetState.Idle,
        slot,
        own: true,
      });
      return;
    }

    const placed: EngineBet = {
      ...bet,
      betId: `${this.roundId}-slot${slot}`,
      state: BetState.Placed,
    };
    this.bets[slot] = placed;
    if (!freeBet) this.balance -= placed.amount;

    EventBus.emit(GameEvent.BetPlaced, {
      slot,
      amount: placed.amount,
      currency: placed.currency,
      betId: placed.betId,
      balance: this.balance,
      freeBetId: placed.freeBetId,
    });
    this.emitBalance();
    EventBus.emit(GameEvent.BetUpdate, {
      betId: placed.betId,
      username: "You",
      amount: placed.amount,
      currency: placed.currency,
      status: BetState.Placed,
      slot,
      own: true,
    });
  }

  private enterBettingClosing() {
    this.stopCountdown();
    this.phase = GamePhase.BettingClosing;
    EventBus.emit(GameEvent.GamePhaseChange, this.phase);
    this.emitTick(this.phase, 0);
    this.schedule(ROUND_TIMINGS.closingMs, () => this.enterFlying());
  }

  private startCountdown() {
    this.stopCountdown();
    this.countdownTimer = setInterval(() => {
      if (this.phase === GamePhase.BettingOpen) {
        this.emitTick(GamePhase.BettingOpen, ROUND_TIMINGS.bettingMs);
      }
    }, 100);
  }

  private stopCountdown() {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private enterFlying() {
    this.phase = GamePhase.Flying;
    this.flyStart = now();
    this.multiplier = 1;

    // Promote every accepted bet from Placed → Active.
    for (const bet of this.bets) {
      if (bet && bet.state === BetState.Placed) bet.state = BetState.Active;
    }

    EventBus.emit(GameEvent.CrashState, { crashed: false });
    EventBus.emit(GameEvent.GamePhaseChange, this.phase);
    this.emitTick(this.phase, 0);
    this.loopFlying();
  }

  private loopFlying = () => {
    if (this.phase !== GamePhase.Flying) return;

    const elapsedSec = (now() - this.flyStart) / 1000;
    this.multiplier = multiplierAt(elapsedSec);

    if (this.multiplier >= this.crashPoint) {
      this.multiplier = this.crashPoint;
      this.enterCrashed();
      return;
    }

    // Auto-cashout: settle any active bet whose target the multiplier reached.
    for (let slot = 0; slot < this.bets.length; slot += 1) {
      const bet = this.bets[slot];
      if (
        bet &&
        bet.state === BetState.Active &&
        bet.autoCashoutAt &&
        this.multiplier >= bet.autoCashoutAt
      ) {
        this.settleCashout(slot as BetSlot, bet.autoCashoutAt, true);
      }
    }

    this.emitTick(GamePhase.Flying, 0);
    this.rafId = requestAnimationFrame(this.loopFlying);
  };

  private enterCrashed() {
    this.phase = GamePhase.Crashed;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Any bet still live when the round busts is lost.
    for (let slot = 0; slot < this.bets.length; slot += 1) {
      const bet = this.bets[slot];
      if (bet && (bet.state === BetState.Active || bet.state === BetState.Placed)) {
        bet.state = BetState.Lost;
        EventBus.emit(GameEvent.BetUpdate, {
          betId: bet.betId,
          username: "You",
          amount: bet.amount,
          currency: bet.currency,
          status: BetState.Lost,
          slot: slot as BetSlot,
          own: true,
        });
      }
    }

    EventBus.emit(GameEvent.CrashState, {
      crashed: true,
      multiplier: this.crashPoint,
    });
    EventBus.emit(GameEvent.CrashHistoryItem, {
      id: this.roundId,
      roundId: this.roundId,
      multiplier: this.crashPoint,
    });
    EventBus.emit(GameEvent.GamePhaseChange, this.phase);
    this.emitTick(GamePhase.Crashed, 0);

    this.schedule(ROUND_TIMINGS.crashedMs, () => this.enterBettingOpen());
  }

  // ── Commands from the UI ───────────────────────────────────

  private placeBet(p: CmdPlaceBetPayload) {
    // Block only a still-live bet in the slot. A resolved bet (Won/Lost) from
    // the round that just ended may still sit here until the next BETTING_OPEN
    // clears it — that must not stop a new bet / pre-bet.
    const existing = this.bets[p.slot];
    if (
      existing &&
      existing.state !== BetState.Won &&
      existing.state !== BetState.Lost
    ) {
      return;
    }
    if (p.amount <= 0) return;

    const bettingOpen =
      this.phase === GamePhase.BettingOpen ||
      this.phase === GamePhase.BettingClosing;

    // Outside the betting window this becomes a pre-bet: queued now, no balance
    // taken, auto-placed when the next round's betting window opens.
    if (!bettingOpen) {
      this.bets[p.slot] = {
        betId: `queued-slot${p.slot}`,
        amount: p.amount,
        currency: p.currency,
        autoCashoutAt: p.autoCashoutAt,
        state: BetState.Queued,
        freeBetId: p.freeBetId,
      };
      EventBus.emit(GameEvent.BetUpdate, {
        betId: this.bets[p.slot]!.betId,
        username: "You",
        amount: p.amount,
        currency: p.currency,
        status: BetState.Queued,
        slot: p.slot,
        own: true,
        freeBetId: p.freeBetId,
      });
      return;
    }

    // A free bet spends a ticket from its grant, so the wallet is untouched —
    // no funds check, no debit. What the grant has left is checked by the
    // caller; a real server would re-check it here.
    const freeBet = p.freeBetId ? freeBetStore.getGrant(p.freeBetId) : undefined;
    if (p.freeBetId && !freeBet) return;
    if (!freeBet && p.amount > this.balance) return;

    const betId = `${this.roundId}-slot${p.slot}`;
    this.bets[p.slot] = {
      betId,
      amount: p.amount,
      currency: p.currency,
      autoCashoutAt: p.autoCashoutAt,
      state: BetState.Placed,
      freeBetId: p.freeBetId,
    };
    if (!freeBet) this.balance -= p.amount;

    EventBus.emit(GameEvent.BetPlaced, {
      slot: p.slot,
      amount: p.amount,
      currency: p.currency,
      betId,
      balance: this.balance,
      freeBetId: p.freeBetId,
    });
    this.emitBalance();
    EventBus.emit(GameEvent.BetUpdate, {
      betId,
      username: "You",
      amount: p.amount,
      currency: p.currency,
      status: BetState.Placed,
      slot: p.slot,
      own: true,
      freeBetId: p.freeBetId,
    });
  }

  private cashout(slot: BetSlot) {
    const bet = this.bets[slot];
    if (this.phase !== GamePhase.Flying) return;
    if (!bet || bet.state !== BetState.Active) return;
    this.settleCashout(slot, this.multiplier, false);
  }

  private settleCashout(slot: BetSlot, atMultiplier: number, auto: boolean) {
    const bet = this.bets[slot];
    if (!bet || bet.state !== BetState.Active) return;

    // Round (not floor) to 2dp: flooring a target like 1.15 hits the classic
    // `1.15 * 100 = 114.9999…` float artefact and would short the player.
    const multiplier = Math.round(atMultiplier * 100) / 100;
    // Pure profit grants keep the stake — only what it earned is credited.
    const grant = bet.freeBetId
      ? freeBetStore.getGrant(bet.freeBetId)
      : undefined;
    const factor =
      grant?.payout === FreeBetPayout.PureProfit ? multiplier - 1 : multiplier;
    const payout = Math.round(bet.amount * factor * 100) / 100;
    bet.state = BetState.Won;
    this.balance += payout;

    EventBus.emit(GameEvent.CashoutDone, {
      slot,
      multiplier,
      payout,
      betAmount: bet.amount,
      balance: this.balance,
      auto,
    });
    this.emitBalance();
    EventBus.emit(GameEvent.BetUpdate, {
      betId: bet.betId,
      username: "You",
      amount: bet.amount,
      currency: bet.currency,
      status: BetState.Won,
      cashedOutAt: multiplier,
      payout,
      slot,
      own: true,
    });
  }

  private cancelBet(slot: BetSlot) {
    const bet = this.bets[slot];
    if (!bet) return;

    if (bet.state === BetState.Queued) {
      // Pre-bet: nothing was debited, so just drop it (any phase).
      this.bets[slot] = null;
      EventBus.emit(GameEvent.CancelBetOk, {
        slot,
        betId: bet.betId,
        balance: this.balance,
      });
      EventBus.emit(GameEvent.BetUpdate, {
        betId: bet.betId,
        username: "You",
        amount: bet.amount,
        currency: bet.currency,
        status: BetState.Idle,
        slot,
        own: true,
        freeBetId: bet.freeBetId,
      });
      return;
    }

    const bettingOpen =
      this.phase === GamePhase.BettingOpen ||
      this.phase === GamePhase.BettingClosing;
    if (bet.state !== BetState.Placed || !bettingOpen) return;

    if (!bet.freeBetId) this.balance += bet.amount;
    this.bets[slot] = null;

    EventBus.emit(GameEvent.CancelBetOk, {
      slot,
      betId: bet.betId,
      balance: this.balance,
      freeBetId: bet.freeBetId,
    });
    this.emitBalance();
    EventBus.emit(GameEvent.BetUpdate, {
      betId: bet.betId,
      username: "You",
      amount: bet.amount,
      currency: bet.currency,
      status: BetState.Idle,
      slot,
      own: true,
      freeBetId: bet.freeBetId,
    });
  }

  // ── Emit helpers ───────────────────────────────────────────

  private emitTick(phase: GamePhase, plannedRemainingMs: number) {
    const remainingMs =
      plannedRemainingMs > 0
        ? Math.max(0, Math.round(this.phaseEndsAt - now()))
        : plannedRemainingMs;
    const payload: TickPayload = {
      multiplier: this.multiplier,
      phase,
      roundId: this.roundId,
      remainingMs: phase === GamePhase.BettingOpen ? remainingMs : 0,
    };
    EventBus.emit(GameEvent.Tick, payload);
  }

  private emitBalance() {
    EventBus.emit(GameEvent.Balance, { balance: this.balance });
  }

  private broadcastPhaseSync() {
    EventBus.emit(GameEvent.GamePhaseChange, this.phase);
    EventBus.emit(GameEvent.Balance, { balance: this.balance });
  }

  private schedule(ms: number, fn: () => void) {
    if (this.phaseTimer !== null) clearTimeout(this.phaseTimer);
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      if (this.running) fn();
    }, ms);
  }
}

/** Shared singleton — one engine per page. */
export const crashEngine = new CrashEngine();
