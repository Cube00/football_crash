import type { FreeBet } from "./FreeBetsContent.types";

/** Radio value for staking the wallet instead of a free bet. */
export const REAL_MONEY_ID = "real-money";

/** Shared `name`, so every row in the modal is one radio group. */
export const FREE_BET_GROUP = "free-bet";

/** Column headings above each value in a card. */
export const FreeBetLabel = {
  Type: "Type",
  BetAmount: "Bet Amount",
  BetPrice: "Bet Price",
  Accrued: "Accrued",
  MinWithdrawal: "Min.Withdrawal",
  ExpirationDate: "Expiration Date",
} as const;

/** Placeholder grants until the wallet API is wired up. */
export const ACTIVE_FREE_BETS: readonly FreeBet[] = [
  {
    id: "full-payout",
    type: "Full Payout",
    betAmount: "10/10",
    betPrice: "0.5 USD",
    accrued: "11 Feb, 2026 08:57",
    minWithdrawal: "3.5x",
    expiresAt: "09 Feb, 2026 22:11",
  },
  {
    id: "pure-profit",
    type: "Pure Profit",
    betAmount: "10/10",
    betPrice: "0.5 USD",
    accrued: "11 Feb, 2026 08:57",
    minWithdrawal: "3.5x",
    expiresAt: "09 Feb, 2026 22:11",
  },
  {
    id: "bonus-balance",
    type: "Bonus Balance",
    betAmount: "30 USD",
    accrued: "11 Feb, 2026 08:57",
    minWithdrawal: "3.5x",
    expiresAt: "09 Feb, 2026 22:11",
  },
];
