import type { TranslationKey } from "@/i18n/types";

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
