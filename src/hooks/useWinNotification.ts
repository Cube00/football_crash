import { useCallback, useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { GameEvent } from "@/game/events";
import type { BetUpdatePayload } from "@/game/events";
import { BetState } from "@/game/enums";

/** How long a win stays on screen before it dismisses itself. */
export const WIN_NOTIFICATION_MS = 4000;

export interface WinNotice {
  /** The winning bet — a second cashout replaces the notice and its timer. */
  betId: string;
  amount: number;
  currency: string;
}

export interface WinNotificationState {
  win: WinNotice | null;
  dismiss: () => void;
}

/**
 * The player's most recent cashout, held for {@link WIN_NOTIFICATION_MS}.
 *
 * Reads the bet stream rather than the game store: the store keeps a slot in
 * `Won` until the next round resets it, which is far longer than the notice
 * should live, and it cannot tell a fresh win from one already shown.
 */
export function useWinNotification(): WinNotificationState {
  const [win, setWin] = useState<WinNotice | null>(null);

  useEffect(() => {
    const onBetUpdate = (update: BetUpdatePayload) => {
      if (!update.own || update.status !== BetState.Won) return;
      if (update.payout == null) return;

      setWin({
        betId: update.betId,
        amount: update.payout,
        currency: update.currency,
      });
    };

    EventBus.on(GameEvent.BetUpdate, onBetUpdate);
    return () => {
      EventBus.off(GameEvent.BetUpdate, onBetUpdate);
    };
  }, []);

  useEffect(() => {
    if (!win) return;
    const timer = setTimeout(() => setWin(null), WIN_NOTIFICATION_MS);
    return () => clearTimeout(timer);
  }, [win]);

  const dismiss = useCallback(() => setWin(null), []);

  return { win, dismiss };
}
