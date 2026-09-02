import { useEffect, useState } from "react";
import { BetState, useKrashClient } from "@/sdk";
import type { BetUpdatePayload } from "@/sdk";

/** Rows the feed keeps. Past this the oldest fall off the bottom. */
const MAX_ROWS = 50;

/**
 * The live "All bets" feed.
 *
 * The SDK publishes other players' bets as a `bet-update` broadcast and offers
 * no hook for them — its guide points the bet list at the event API, because a
 * feed is a scrollback the skin decides the shape of, not shared game state.
 * So this accumulates, and does nothing else: a row is replaced by its own
 * `betId`, the newest sits on top, and the tail is dropped.
 *
 * Rounds are not cleared between one another. The list spans them, which is
 * why bet ids have to be unique across rounds — a repeated id silently
 * overwrites an older row rather than adding one.
 */
export function useRoundBets(): readonly BetUpdatePayload[] {
  const client = useKrashClient();
  const [rows, setRows] = useState<readonly BetUpdatePayload[]>([]);

  useEffect(() => {
    return client.on("bet-update", (update) => {
      setRows((current) => {
        const rest = current.filter((row) => row.betId !== update.betId);
        if (update.state === BetState.Idle) return rest;
        return [update, ...rest].slice(0, MAX_ROWS);
      });
    });
  }, [client]);

  return rows;
}
