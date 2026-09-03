import { useEffect, useRef, useState } from "react";
import { GamePhase, useKrashClient } from "@/sdk";
import type { BetUpdatePayload } from "@/sdk";

/** Cancelled bets leave the feed; the SDK has no separate cancel event. */
const CANCELLED = "CANCELLED";

/** Hundreds of updates land during a flight — coalesce them into ~5 renders/s. */
const BATCH_MS = 200;

export interface RoundBets {
  rows: readonly BetUpdatePayload[];
  /**
   * The player's own row, identified by the `fakeIdentifier` the server gave
   * the bet this session. `null` after a reconnect until the next bet — the
   * refill from `RoundBets` carries no `bet-placed` to match against.
   */
  ownIdentifier: string | null;
}

/**
 * The live "All bets" feed.
 *
 * Other players' bets are a broadcast, not a store slice — the SDK offers no
 * hook for them on purpose, because a feed is a scrollback whose shape is the
 * skin's decision. So this accumulates from `bet-update`, following the rules
 * the SDK's feed chapter sets out
 * (`.claude/sdk-docs/panels/11-live-bets-feed.md`):
 *
 *   - **upsert by `betId`** — the same bet arrives again as it is placed, then
 *     cashed out; appending would show it twice;
 *   - **`CANCELLED` removes the row**;
 *   - **clear on `BETTING_OPEN`** — the feed is one round, and the round
 *     boundary is the only thing that empties it;
 *   - **drop stale rounds** — a reconnect refills the feed from `RoundBets`,
 *     which can still be answering for the round that just ended.
 */
export function useRoundBets(): RoundBets {
  const client = useKrashClient();
  const [rows, setRows] = useState<readonly BetUpdatePayload[]>([]);
  const [ownIdentifier, setOwnIdentifier] = useState<string | null>(null);
  const ownBetIds = useRef(new Set<string>());

  useEffect(() => {
    const bets = new Map<string, BetUpdatePayload>();
    let roundId = "";
    let flush: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (flush !== null) return;
      flush = setTimeout(() => {
        flush = null;
        setRows([...bets.values()]);
      }, BATCH_MS);
    };

    const clear = () => {
      bets.clear();
      if (flush !== null) {
        clearTimeout(flush);
        flush = null;
      }
      setRows([]);
    };

    const unsubscribe = [
      client.on("tick", (payload) => {
        if (payload.roundId) roundId = payload.roundId;
      }),

      // The server never says which row is the player's; the bet it just
      // confirmed does, once the same id comes back around on the broadcast.
      client.on("bet-placed", ({ betId }) => {
        ownBetIds.current.add(betId);
      }),

      client.on("bet-update", (update) => {
        if (ownBetIds.current.has(update.betId) && update.fakeIdentifier) {
          setOwnIdentifier(update.fakeIdentifier);
          ownBetIds.current.delete(update.betId);
        }
        if (update.roundId && roundId && update.roundId !== roundId) return;

        if (update.status === CANCELLED) bets.delete(update.betId);
        else bets.set(update.betId, update);
        schedule();
      }),

      client.on("phase-change", ({ phase }) => {
        if (phase === GamePhase.BettingOpen) clear();
      }),
    ];

    return () => {
      unsubscribe.forEach((off) => off());
      if (flush !== null) clearTimeout(flush);
    };
  }, [client]);

  return { rows, ownIdentifier };
}
