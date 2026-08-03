import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAmbient } from "@/hooks";
import { crashEngine } from "@/game/engine/crashEngine";
import { startFakeBets } from "@/game/engine/fakeBets";
import { gameStore } from "@/game/store";
import { freeBetStore } from "@/game/freeBetStore";
import { preloadSoundsOnFirstGesture } from "@/game/sounds";

interface GameProviderProps {
  children: ReactNode;
}

/**
 * Boots the local crash engine once for the app and wires it to the reactive
 * store. Store + fake bots connect *before* the engine starts so they catch the
 * very first round's events. Everything reads game state through the store
 * hooks, so no React context value is needed here.
 */
export const GameProvider = ({ children }: GameProviderProps) => {
  // The beach bed runs for the life of the page, like the engine.
  useAmbient();

  useEffect(() => {
    // Click sounds are fetched on the first gesture, not here — see
    // `preloadSoundsOnFirstGesture`.
    const stopSoundWarmup = preloadSoundsOnFirstGesture();

    const disconnectStore = gameStore.connect();
    const disconnectFreeBets = freeBetStore.connect();
    const stopFakeBets = startFakeBets();
    crashEngine.start();

    return () => {
      stopSoundWarmup();
      crashEngine.stop();
      stopFakeBets();
      disconnectFreeBets();
      disconnectStore();
    };
  }, []);

  return children;
};
