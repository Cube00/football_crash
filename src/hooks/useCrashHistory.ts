import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameHistory, useKrashClient } from "@/sdk";
import type { GameHistoryItem } from "@/sdk";

export interface CrashHistory {
  /** Newest round first. */
  rounds: readonly GameHistoryItem[];
  /** Re-asks the server; the answer replaces the list. Default limit 50. */
  fetch: (limit?: number) => void;
}

/** How many live crashes to hold. The server's list is the long memory. */
const MAX_LIVE = 50;

/**
 * Finished rounds, newest first — the server's list with the live crashes
 * merged in.
 *
 * `useGameHistory()` alone is not enough, and the gap is documented rather than
 * accidental: it only ever updates on a `game-history` response, so after a
 * crash its list is stale until something calls `fetch()` again. The SDK does
 * emit the finished round immediately, as `crash-history-item`, generated from
 * the CRASHED tick without waiting for the server. Merging the two is the
 * skin's job (`.claude/sdk-docs/panels/12-statistics.md`).
 *
 * Named away from `useGameHistory` deliberately — the docs warn that a
 * same-named local hook makes the imports ambiguous.
 */
export function useCrashHistory(): CrashHistory {
  const client = useKrashClient();
  const { items, fetch } = useGameHistory();
  const [live, setLive] = useState<readonly GameHistoryItem[]>([]);

  useEffect(
    () =>
      client.on("crash-history-item", (item) => {
        setLive((current) => [
          {
            roundId: item.roundId,
            crashAt: item.crashAt,
            fairnessHash: item.fairnessHash ?? "",
            serverSeed: item.serverSeed ?? "",
            // The event carries the moment of the crash, where the server's
            // rows carry the moment the round started. Close enough to sort
            // and to print; they are never compared against each other.
            startTimeMs: item.timestamp,
          },
          ...current.slice(0, MAX_LIVE - 1),
        ]);
      }),
    [client],
  );

  // Merged rather than replaced: a server answer is authoritative for the
  // rounds it covers, so anything it already contains drops out of the live
  // list instead of showing twice.
  const rounds = useMemo(() => {
    if (live.length === 0) return items;
    const known = new Set(items.map((round) => round.roundId));
    return [...live.filter((round) => !known.has(round.roundId)), ...items];
  }, [items, live]);

  const refetch = useCallback((limit?: number) => fetch(limit), [fetch]);

  return { rounds, fetch: refetch };
}
