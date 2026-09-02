import { useEffect, useState } from "react";
import { useKrashClient } from "@/sdk";

export interface LiveFairness {
  roundId: string;
  /** The commit: published before the round runs, checkable after it. */
  fairnessHash?: string;
}

/**
 * The commit half of provably fair, for the round that is running now.
 *
 * The SDK carries `fairnessHash` and `serverSeed` on the tick and on
 * `crash-history-item`, but exposes neither as a hook, so this reads the tick.
 * The reveal half is a finished round — take it from `useGameHistory()`.
 */
export function useLiveFairness(): LiveFairness {
  const client = useKrashClient();
  const [fairness, setFairness] = useState<LiveFairness>({ roundId: "" });

  useEffect(() => {
    return client.on("tick", ({ roundId, fairnessHash }) => {
      setFairness((current) =>
        current.roundId === roundId && current.fairnessHash === fairnessHash
          ? current
          : { roundId, fairnessHash },
      );
    });
  }, [client]);

  return fairness;
}
