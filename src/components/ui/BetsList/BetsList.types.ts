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

/**
 * The round totals bar.
 *
 * There is no endpoint behind these and there is not meant to be: the SDK's
 * feed chapter has the footer counted from the rows the client already holds —
 * how many of this round's bets have cashed out, and what they took. The
 * caller computes it from the same list it passes as `rows`.
 */
export interface BetsSummary {
  /** Bets that have cashed out. */
  placed: number;
  /** Bets in the round. */
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
  /** The operator's `currencyMinorUnits`. */
  decimals?: number;
  variant?: BetsListVariant;
}
