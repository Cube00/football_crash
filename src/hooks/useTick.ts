import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { GameEvent } from "@/game/events";
import type { TickPayload } from "@/game/events";
import { GamePhase } from "@/game/enums";

/**
 * Live per-tick multiplier subscription. Kept out of the main game store
 * because it updates ~30×/sec — only components that render the number itself
 * (the big multiplier, the live cashout value) should use this.
 */

let latestMultiplier = 1;
let latestPhase: GamePhase = GamePhase.BettingOpen;

/** Synchronous read for callbacks that can't wait for a re-render (auto-play). */
export function getLatestMultiplier(): number {
  return latestMultiplier;
}

export function getLatestPhase(): GamePhase {
  return latestPhase;
}

export interface TickState {
  multiplier: number;
  /** `multiplier` formatted to 2 decimals, e.g. `"1.00"`. */
  tick: string;
  phase: GamePhase;
  remainingMs: number;
  crashed: boolean;
}

export function useTick(): TickState {
  const [state, setState] = useState<TickState>({
    multiplier: 1,
    tick: "1.00",
    phase: GamePhase.BettingOpen,
    remainingMs: 0,
    crashed: false,
  });

  useEffect(() => {
    const handleTick = (payload: TickPayload) => {
      latestMultiplier = payload.multiplier;
      latestPhase = payload.phase;
      setState({
        multiplier: payload.multiplier,
        tick: payload.multiplier.toFixed(2),
        phase: payload.phase,
        remainingMs: payload.remainingMs,
        crashed: payload.phase === GamePhase.Crashed,
      });
    };

    EventBus.on(GameEvent.Tick, handleTick);
    return () => {
      EventBus.off(GameEvent.Tick, handleTick);
    };
  }, []);

  return state;
}
