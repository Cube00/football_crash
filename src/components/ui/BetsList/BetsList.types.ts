import type { HTMLAttributes } from "react";
import type { BetsListVariant, BetStatus } from "./BetsList.constants";

export interface BetRow {
  id: string;
  bet: number;
  status: BetStatus;
  /** Shown in the first column of the All bets list. */
  player?: string;
  /** Shown in the first column of the My Bets list. */
  date?: string;
  time?: string;
  multiplier?: number;
  cashout?: number;
  own?: boolean;
}

export interface BetsListProps extends HTMLAttributes<HTMLDivElement> {
  rows?: BetRow[];
  currency?: string;
  variant?: BetsListVariant;
}
