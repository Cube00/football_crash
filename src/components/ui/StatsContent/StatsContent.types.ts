import type { HTMLAttributes } from "react";

export interface StatsContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Recent multipliers shown as pills on the Stats tab. */
  multipliers?: number[];
  /** Multiplier per round, oldest first — plotted on the Chart tab. */
  roundsHistory?: number[];
  rounds?: number;
  onRoundsChange?: (rounds: number) => void;
}
