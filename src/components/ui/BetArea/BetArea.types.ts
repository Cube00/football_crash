import type { HTMLAttributes } from "react";

export interface BetAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Currency shown on the Bet button. */
  currency?: string;
  /** Initial stake amount. */
  defaultAmount?: number;
  /** Initial auto cash-out multiplier. */
  defaultMultiplier?: number;
}
