import { useMemo } from "react";
import { useCurrency, useGameConfig } from "@/sdk";

export interface Money {
  /** Uppercase currency code to print next to an amount. */
  currency: string;
  /** Decimal places for every amount on screen. */
  decimals: number;
  /** An amount at the operator's precision, without the code. */
  format: (amount: number) => string;
}

/**
 * How money is written in this game.
 *
 * Both halves are the operator's, and both arrive from the server: the code and
 * the number of decimals are `GameConfig.currencyCode` / `currencyMinorUnits`.
 * A hardcoded `toFixed(2)` is listed among the SDK's common mistakes for
 * exactly this reason — minor units are not 2 everywhere.
 *
 * Until `game-config` lands, the display currency comes from the SDK's
 * `CurrencyProvider`, which reads `?currency` and falls back to USD. That
 * replaced the skin's own fallback constant.
 */
export function useMoney(): Money {
  const config = useGameConfig();
  const { currency } = useCurrency();

  const code = (config?.currencyCode || currency).toUpperCase();
  const decimals = config?.currencyMinorUnits ?? 2;

  return useMemo(
    () => ({
      currency: code,
      decimals,
      format: (amount: number) => amount.toFixed(decimals),
    }),
    [code, decimals],
  );
}
