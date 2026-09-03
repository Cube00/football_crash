import { useEffect, useState } from "react";
import { GamePhase, useKrashClient, usePhase } from "@/sdk";

export interface RoundCountdown {
  /** Time left in the betting window. `0` outside it. */
  remainingMs: number;
  /** What the window started at — the denominator for a progress bar. */
  totalMs: number;
}

/** Past this the client is far enough out to take the server's word again. */
const RESYNC_MS = 500;

/**
 * The betting window's countdown.
 *
 * `remainingMs` rides on the `tick` event and **only** there: it is not a store
 * slice and there is no hook for it, which the SDK's own countdown recipe says
 * outright (`.claude/sdk-docs/panels/03-multiplier-and-countdown.md`). So this
 * subscribes to the event, which is the documented way.
 *
 * The window's *length* is not published either — the SDK carries no phase
 * durations, because the server owns them and can change them between rounds.
 * The first tick of each window is therefore the bar's full width: whatever the
 * server says is left at that moment is what the bar counts down from. That is
 * what replaced the skin's hardcoded six seconds, which was only ever a guess
 * at a number the server already sends.
 */
export function useRoundCountdown(): RoundCountdown {
  const client = useKrashClient();
  const phase = usePhase();
  const [countdown, setCountdown] = useState<RoundCountdown>({
    remainingMs: 0,
    totalMs: 0,
  });

  useEffect(() => {
    // Not state: a round's total is written and read within one tick handler,
    // and re-rendering to store it would be a render per tick for nothing.
    let totalMs = 0;

    return client.on("tick", (payload) => {
      if (payload.phase !== GamePhase.BettingOpen) {
        totalMs = 0;
        return;
      }
      if (payload.remainingMs <= 0) return;

      // A window that has not been measured yet, or one whose clock has drifted
      // far enough that keeping the old total would show a bar that never
      // empties: take this tick as the new full width.
      if (totalMs === 0 || payload.remainingMs > totalMs + RESYNC_MS) {
        totalMs = payload.remainingMs;
      }
      setCountdown({ remainingMs: payload.remainingMs, totalMs });
    });
  }, [client]);

  // Outside the betting window there is no countdown to show, and the last
  // tick's value would otherwise sit frozen on the bar.
  return phase === GamePhase.BettingOpen
    ? countdown
    : { remainingMs: 0, totalMs: 0 };
}
