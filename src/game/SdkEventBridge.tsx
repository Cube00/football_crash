import { useEffect, useRef } from "react";
import { useKrashClient, usePhase } from "@/sdk";
import { EventBus } from "./EventBus";
import { GameEvent } from "./events";

/**
 * Relays SDK events onto the skin's {@link EventBus}.
 *
 * This is the pattern the SDK's integration guide prescribes for a canvas: one
 * subscription near the root, re-emitted on a plain emitter, so the Phaser scene
 * and the sound layer never take part in a React render. Mount it once, inside
 * the provider and after the loader gate.
 *
 * It relays and nothing else. No derivation, no caching, no state — if the
 * canvas needs something the SDK does not send, the answer is a new SDK event,
 * not a computation here.
 */
export const SdkEventBridge = () => {
  const client = useKrashClient();
  const phase = usePhase();

  // The scene can boot mid-round — lazily, or after the menu switches the
  // animation back on — and it only learns the phase from an event. Held in a
  // ref so answering a sync request never re-subscribes the relays below.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const off = [
      client.on("tick", (p) => EventBus.emit(GameEvent.Tick, p)),
      client.on("phase-change", (p) => EventBus.emit(GameEvent.PhaseChange, p)),
      client.on("crash", (p) => EventBus.emit(GameEvent.Crash, p)),
      client.on("bet-placed", (p) => EventBus.emit(GameEvent.BetPlaced, p)),
      client.on("cashout-done", (p) => EventBus.emit(GameEvent.CashoutDone, p)),
    ];
    return () => {
      for (const unsubscribe of off) unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    const answer = () =>
      EventBus.emit(GameEvent.PhaseChange, {
        phase: phaseRef.current,
        roundId: "",
      });

    EventBus.on(GameEvent.RequestPhaseSync, answer);
    return () => {
      EventBus.off(GameEvent.RequestPhaseSync, answer);
    };
  }, []);

  return null;
};
