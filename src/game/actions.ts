import { EventBus } from "./EventBus";
import { GameEvent } from "./events";
import type { BetSlot } from "./enums";

/**
 * Thin command emitters — the only way the UI talks to the engine. Kept
 * separate from the read-only {@link gameStore} so components import just what
 * they need.
 */
export const gameActions = {
  placeBet(
    slot: BetSlot,
    amount: number,
    currency: string,
    autoCashoutAt?: number,
    freeBetId?: string,
  ) {
    EventBus.emit(GameEvent.CmdPlaceBet, {
      slot,
      amount,
      currency,
      autoCashoutAt,
      freeBetId,
    });
  },

  cashout(slot: BetSlot) {
    EventBus.emit(GameEvent.CmdCashout, { slot });
  },

  cancelBet(slot: BetSlot) {
    EventBus.emit(GameEvent.CmdCancelBet, { slot });
  },
};
