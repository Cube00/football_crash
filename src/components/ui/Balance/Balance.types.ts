import type { HTMLAttributes } from "react";

export interface BalanceProps extends HTMLAttributes<HTMLDivElement> {
  /** Current balance, in major units of `currency`. */
  amount: number;
  currency: string;
  /** Caption above the amount. */
  label?: string;
}
