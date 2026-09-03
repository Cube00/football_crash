import { useEffect } from "react";
import type { ReactNode } from "react";
import { useClientConfigDefaults, useSoundSettings } from "@/hooks";
import { SdkEventBridge } from "@/game/SdkEventBridge";
import { preloadSoundsOnFirstGesture } from "@/game/sounds";

interface GameProviderProps {
  children: ReactNode;
}

/**
 * Everything the skin owns for the life of the page: the audio layer, the
 * operator's starting values, and the relay that feeds SDK events to the canvas.
 *
 * It used to boot a local crash engine and two stores here. All of that is the
 * SDK's now — round state arrives through `KrashProvider` and is read with
 * hooks, so there is nothing left to start and no context value to hand down.
 *
 * TODO(sdk): `KrashProvider` mounts *outside* this, in `main.tsx`, because
 * `SdkEventBridge` needs a client to subscribe to.
 */
export const GameProvider = ({ children }: GameProviderProps) => {
  // Both are one-per-app: one writes the sound module's mirror, the other
  // writes the bet inputs. A second caller of either would fight the first.
  useSoundSettings();
  useClientConfigDefaults();

  useEffect(() => {
    // Click sounds are fetched on the first gesture, not here — see
    // `preloadSoundsOnFirstGesture`.
    return preloadSoundsOnFirstGesture();
  }, []);

  return (
    <>
      <SdkEventBridge />
      {children}
    </>
  );
};
