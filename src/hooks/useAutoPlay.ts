import { useCallback, useEffect, useRef, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { GameEvent } from "@/game/events";
import type { CashoutDonePayload } from "@/game/events";
import { GamePhase } from "@/game/enums";
import type { BetSlot } from "@/game/enums";
import { gameStore } from "@/game/store";
import { DEFAULT_AUTO_PLAY_CONFIG } from "@/game/autoplay";
import type { AutoPlayConfig } from "@/game/autoplay";
import { loadState, saveAutoPlayConfig } from "@/game/persistence";

interface UseAutoPlayArgs {
  slot: BetSlot;
  /** Places a bet now using the slot's current amount + auto-cashout. */
  placeBet: () => void;
}

export interface UseAutoPlayReturn {
  config: AutoPlayConfig;
  isActive: boolean;
  currentRound: number;
  updateConfig: (partial: Partial<AutoPlayConfig>) => void;
  start: (roundsOverride?: number) => void;
  stop: () => void;
  reset: () => void;
}

export function useAutoPlay({ slot, placeBet }: UseAutoPlayArgs): UseAutoPlayReturn {
  const [config, setConfig] = useState<AutoPlayConfig>(
    () => loadState().autoPlayConfig[slot] ?? DEFAULT_AUTO_PLAY_CONFIG,
  );
  const [isActive, setIsActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);

  const ref = useRef({
    config,
    isActive,
    currentRound,
    startBalance: 0,
    placeBet,
  });

  // Keep the mutable mirror in sync — inside an effect, never during render.
  useEffect(() => {
    ref.current.config = config;
    ref.current.isActive = isActive;
    ref.current.currentRound = currentRound;
    ref.current.placeBet = placeBet;
  });

  useEffect(() => {
    saveAutoPlayConfig(slot, config);
  }, [slot, config]);

  const updateConfig = useCallback((partial: Partial<AutoPlayConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const stop = useCallback(() => {
    ref.current.isActive = false;
    ref.current.currentRound = 0;
    setIsActive(false);
    setCurrentRound(0);
    setConfig((prev) => (prev.autoBet ? { ...prev, autoBet: false } : prev));
  }, []);

  const placeNext = useCallback((round: number) => {
    ref.current.placeBet();
    const next = round - 1;
    ref.current.currentRound = next;
    setCurrentRound(next);
  }, []);

  const reset = useCallback(() => {
    ref.current.isActive = false;
    ref.current.currentRound = 0;
    setIsActive(false);
    setCurrentRound(0);
    setConfig(DEFAULT_AUTO_PLAY_CONFIG);
  }, []);

  const start = useCallback(
    (roundsOverride?: number) => {
      const rounds = roundsOverride ?? ref.current.config.rounds;
      ref.current.startBalance = gameStore.getSnapshot().balance;
      ref.current.isActive = true;
      ref.current.currentRound = rounds;
      setIsActive(true);
      setCurrentRound(rounds);
      // If a betting window is already open, don't wait a whole round to begin.
      if (gameStore.getSnapshot().phase === GamePhase.BettingOpen) {
        placeNext(rounds);
      }
    },
    [placeNext],
  );

  // Drive the loop off the engine's own phase / cashout events.
  useEffect(() => {
    const onPhase = (phase: GamePhase) => {
      if (phase !== GamePhase.BettingOpen || !ref.current.isActive) return;
      const { config: cfg, currentRound: round, startBalance } = ref.current;
      const change = gameStore.getSnapshot().balance - startBalance;

      const shouldStop =
        round <= 0 ||
        (cfg.stopOnCashDecrease.enabled &&
          cfg.stopOnCashDecrease.amount > 0 &&
          change <= -cfg.stopOnCashDecrease.amount) ||
        (cfg.stopOnCashIncrease.enabled &&
          cfg.stopOnCashIncrease.amount > 0 &&
          change >= cfg.stopOnCashIncrease.amount);

      if (shouldStop) {
        stop();
        return;
      }
      placeNext(round);
    };

    const onCashout = (payload: CashoutDonePayload) => {
      if (payload.slot !== slot || !ref.current.isActive) return;
      const { stopOnSingleWin } = ref.current.config;
      const profit = payload.payout - payload.betAmount;
      if (
        stopOnSingleWin.enabled &&
        stopOnSingleWin.amount > 0 &&
        profit >= stopOnSingleWin.amount
      ) {
        stop();
      }
    };

    EventBus.on(GameEvent.GamePhaseChange, onPhase);
    EventBus.on(GameEvent.CashoutDone, onCashout);
    return () => {
      EventBus.off(GameEvent.GamePhaseChange, onPhase);
      EventBus.off(GameEvent.CashoutDone, onCashout);
    };
  }, [slot, stop, placeNext]);

  return { config, isActive, currentRound, updateConfig, start, stop, reset };
}
