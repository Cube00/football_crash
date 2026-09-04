import { useEffect, useRef } from "react";
import {
  BetSlot,
  useAutoPlay,
  useGameConfig,
  useKrashClient,
} from "@/sdk";
import type { ClientConfig } from "@/sdk";

/**
 * The operator's client config, when there is one.
 *
 * `clientConfig` rides in on `game-config` and carries the quick-bet presets,
 * the multiply button, the +/- step and the two starting values. The SDK only
 * **stores** it: it does not fill the input and does not draw a button. Reading
 * it is what replaced this skin's hardcoded stake chips.
 */
export function useClientConfig(): ClientConfig | undefined {
  return useGameConfig()?.clientConfig;
}

/**
 * Writes the operator's starting values into both slots — once per config
 * revision.
 *
 * `configUpdatedAt` is the revision id and the reason this is not a plain
 * effect on `clientConfig`: `game-config` arrives again on every reconnect, and
 * re-applying it would throw away an amount the player has since typed. Nothing
 * is applied on a repeat of a revision already seen.
 *
 * Call once, high in the tree. The SDK deliberately leaves this to the skin
 * (`.claude/sdk-docs/panels/05-betting-panel.md`).
 */
export function useClientConfigDefaults() {
  const client = useKrashClient();
  const config = useGameConfig();
  const clientConfig = config?.clientConfig;
  const revision = config?.configUpdatedAt;

  const slot1 = useAutoPlay(BetSlot.Slot1);
  const slot2 = useAutoPlay(BetSlot.Slot2);
  const applied = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!clientConfig) return;
    if (revision !== undefined && applied.current === revision) return;
    applied.current = revision;

    client.setBetInputAmount(BetSlot.Slot1, clientConfig.defaultBet);
    client.setBetInputAmount(BetSlot.Slot2, clientConfig.defaultBet);

    // Shallow merge in the engine: spread, or the enabled flag is lost.
    for (const slot of [slot1, slot2]) {
      slot.updateConfig({
        autoCashOut: {
          ...slot.config.autoCashOut,
          multiplier: clientConfig.defaultAutoCashout,
        },
      });
    }
    // The auto-play handles are stable per slot; re-running on their identity
    // would re-apply the config on every render of a consumer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, clientConfig, revision]);
}
