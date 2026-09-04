import type { HTMLAttributes } from "react";

export interface BalanceProps extends HTMLAttributes<HTMLDivElement> {
  /** Current balance, in major units of `currency`. */
  amount: number;
  currency: string;
  /** Decimal places — the operator's `currencyMinorUnits`, not always 2. */
  decimals?: number;
  /** Caption above the amount. */
  label?: string;
}
