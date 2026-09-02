import type { HTMLAttributes } from "react";

export interface StatsContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Overrides the pills on the Stats tab. Defaults to the server's history. */
  multipliers?: readonly number[];
  /** Overrides the Chart tab's series, oldest first. */
  roundsHistory?: readonly number[];
  rounds?: number;
  onRoundsChange?: (rounds: number) => void;
}
