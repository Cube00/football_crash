import type { TranslationKey } from "@/i18n/types";
import type { FreeBet } from "./FreeBetsContent.types";

/** Radio value for staking the wallet instead of a free bet. */
export const REAL_MONEY_ID = "real-money";

/** Shared `name`, so every row in the modal is one radio group. */
export const FREE_BET_GROUP = "free-bet";

/** Translation keys for the column headings above each value in a card. */
export const FreeBetLabel = {
  Type: "freeBets.labels.type",
  BetAmount: "freeBets.labels.betAmount",
  BetPrice: "freeBets.labels.betPrice",
  Accrued: "freeBets.labels.accrued",
  MinWithdrawal: "freeBets.labels.minWithdrawal",
  ExpirationDate: "freeBets.labels.expirationDate",
} as const satisfies Record<string, TranslationKey>;

export type FreeBetLabel = (typeof FreeBetLabel)[keyof typeof FreeBetLabel];

/** Placeholder grants until the wallet API is wired up. */
export const ACTIVE_FREE_BETS: readonly FreeBet[] = [
  {
    id: "full-payout",
    typeKey: "freeBets.types.fullPayout",
    betAmount: "10/10",
    betPrice: "0.5 USD",
    accrued: "11 Feb, 2026 08:57",
    minWithdrawal: "3.5x",
    expiresAt: "09 Feb, 2026 22:11",
  },
  {
    id: "pure-profit",
    typeKey: "freeBets.types.pureProfit",
    betAmount: "10/10",
    betPrice: "0.5 USD",
    accrued: "11 Feb, 2026 08:57",
    minWithdrawal: "3.5x",
    expiresAt: "09 Feb, 2026 22:11",
  },
  {
    id: "bonus-balance",
    typeKey: "freeBets.types.bonusBalance",
    betAmount: "30 USD",
    accrued: "11 Feb, 2026 08:57",
    minWithdrawal: "3.5x",
    expiresAt: "09 Feb, 2026 22:11",
  },
];
