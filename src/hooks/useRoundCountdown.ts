import { useEffect, useState } from "react";
import { GamePhase, useKrashClient, usePhase } from "@/sdk";

/**
 * Milliseconds left in the betting window.
 *
 * The SDK publishes this on the `tick` event (`remainingMs`, meaningful only in
 * `BETTING_OPEN`) but exposes no hook for it — `useMultiplier()` covers the
 * number on the canvas and nothing covers the countdown. So this subscribes to
 * the event directly, which is the SDK's own documented escape hatch.
 *
 * TODO(sdk): ask whether a `useRemainingMs()` (or equivalent) exists. If it
 * does, delete this and use it.
 */
export function useRoundCountdown(): number {
  const client = useKrashClient();
  const phase = usePhase();
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    return client.on("tick", (payload) => {
      setRemainingMs(
        payload.phase === GamePhase.BettingOpen ? payload.remainingMs : 0,
      );
    });
  }, [client]);

  // Outside the betting window there is no countdown to show, and the last
  // tick's value would otherwise sit frozen on the bar.
  return phase === GamePhase.BettingOpen ? remainingMs : 0;
}
