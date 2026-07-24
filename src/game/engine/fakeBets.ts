import { EventBus } from "../EventBus";
import { GameEvent } from "../events";
import type { BetUpdatePayload, TickPayload } from "../events";
import { BetState, GamePhase } from "../enums";
import { FAKE_BETS, GAME_CONFIG } from "../config";

/**
 * Generates fake "other players" each round so the live bets list looks
 * populated. Purely cosmetic: bots subscribe to the same engine events the UI
 * does and settle themselves as the multiplier climbs — bots whose target is
 * reached cash out, the rest are marked lost when the round crashes.
 */

interface Bot {
  betId: string;
  username: string;
  amount: number;
  /** Multiplier this bot intends to cash out at. */
  target: number;
  cashed: boolean;
}

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "0123456789";

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (chars: string) => chars[randInt(0, chars.length - 1)];

/** Masked handle like `G****t` or `K****5`. */
function makeUsername(): string {
  const first = pick(LETTERS);
  const last = Math.random() < 0.5 ? pick(LETTERS.toLowerCase()) : pick(DIGITS);
  return `${first}****${last}`;
}

function makeAmount(): number {
  const choices = [1, 2, 2.5, 5, 5.4, 6, 6.5, 10, 10.5, 12, 15.5, 20];
  return choices[randInt(0, choices.length - 1)];
}

/** Bots cash out mostly low, occasionally chasing a big multiplier. */
function makeTarget(): number {
  const r = Math.random();
  if (r < 0.6) return 1 + Math.random() * 1.5; // 1.00–2.50
  if (r < 0.9) return 2.5 + Math.random() * 5; // 2.50–7.50
  return 7.5 + Math.random() * 40; // long shots
}

function emit(bot: Bot, status: BetState, extra?: Partial<BetUpdatePayload>) {
  EventBus.emit(GameEvent.BetUpdate, {
    betId: bot.betId,
    username: bot.username,
    amount: bot.amount,
    currency: GAME_CONFIG.currency,
    status,
    ...extra,
  } satisfies BetUpdatePayload);
}

export function startFakeBets(): () => void {
  let bots: Bot[] = [];
  let seq = 0;

  const onNewRound = () => {
    const count = randInt(FAKE_BETS.minPlayers, FAKE_BETS.maxPlayers);
    bots = Array.from({ length: count }, () => {
      seq += 1;
      return {
        betId: `bot-${seq}`,
        username: makeUsername(),
        amount: makeAmount(),
        target: Math.round(makeTarget() * 100) / 100,
        cashed: false,
      };
    });
    for (const bot of bots) emit(bot, BetState.Placed);
  };

  const onTick = (payload: TickPayload) => {
    if (payload.phase !== GamePhase.Flying) return;
    for (const bot of bots) {
      if (!bot.cashed && payload.multiplier >= bot.target) {
        bot.cashed = true;
        const payout = Math.round(bot.amount * bot.target * 100) / 100;
        emit(bot, BetState.Won, { cashedOutAt: bot.target, payout });
      }
    }
  };

  const onCrash = (payload: { crashed: boolean }) => {
    if (!payload.crashed) return;
    for (const bot of bots) {
      if (!bot.cashed) emit(bot, BetState.Lost);
    }
  };

  EventBus.on(GameEvent.BettingHistoryClear, onNewRound);
  EventBus.on(GameEvent.Tick, onTick);
  EventBus.on(GameEvent.CrashState, onCrash);

  return () => {
    EventBus.off(GameEvent.BettingHistoryClear, onNewRound);
    EventBus.off(GameEvent.Tick, onTick);
    EventBus.off(GameEvent.CrashState, onCrash);
  };
}
