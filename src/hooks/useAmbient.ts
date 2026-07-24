import { useEffect } from "react";
import { setAmbientPlaying } from "@/game/sounds";
import { useSettings } from "./useSettings";

/**
 * Runs the looping beach bed for as long as the menu's Music switch is on.
 * Call once, from a component that lives as long as the app does.
 */
export function useAmbient() {
  const { music } = useSettings();

  useEffect(() => {
    setAmbientPlaying(music);
    return () => setAmbientPlaying(false);
  }, [music]);
}
