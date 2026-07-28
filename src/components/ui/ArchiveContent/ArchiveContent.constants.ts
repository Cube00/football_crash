import type { ArchivedFreeBet } from "./ArchiveContent.types";

/** Placeholder history until the wallet API is wired up. */
export const ARCHIVED_FREE_BETS: readonly ArchivedFreeBet[] = [
  {
    id: "full-payout",
    typeKey: "freeBets.types.fullPayout",
    betAmount: "10/10",
    betPrice: "0.5 USD",
    payout: "9.49 USD",
  },
  {
    id: "pure-profit",
    typeKey: "freeBets.types.pureProfit",
    betAmount: "10/10",
    betPrice: "0.5 USD",
    payout: "22.18 USD",
  },
  {
    id: "bonus-balance",
    typeKey: "freeBets.types.bonusBalance",
    betAmount: "30 USD",
    payout: "102.40 USD",
  },
];
