import { useEffect } from "react";
import { useSettings } from "@/sdk";
import { setAmbientPlaying, setSoundEnabled } from "@/game/sounds";

/**
 * Connects the SDK's settings to the audio layer.
 *
 * The switches themselves belong to `SettingsProvider` — it owns the three
 * booleans, the `?extraParams` override and the persistence. All that is left
 * here is acting on them: mirroring `sound` into the sound module, which is
 * plain functions and cannot read a context, and running the beach bed for as
 * long as `music` is on.
 *
 * Call once, from a component that lives as long as the app does. Two callers
 * would fight over the module-level mirror.
 */
export function useSoundSettings() {
  const { settings } = useSettings();

  useEffect(() => {
    setSoundEnabled(settings.sound);
  }, [settings.sound]);

  useEffect(() => {
    setAmbientPlaying(settings.music);
    return () => setAmbientPlaying(false);
  }, [settings.music]);
}
