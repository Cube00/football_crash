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

export interface BetsSummary {
  /** Bets placed in this round. */
  placed: number;
  /** Total bets available. */
  total: number;
  /** Total amount staked. */
  totalBet: number;
  /** Total amount won. */
  totalWin: number;
}

export interface BetsListProps extends HTMLAttributes<HTMLDivElement> {
  rows?: BetRow[];
  summary?: BetsSummary;
  currency?: string;
  variant?: BetsListVariant;
}
