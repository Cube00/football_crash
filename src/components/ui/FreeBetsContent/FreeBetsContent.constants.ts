import type { TranslationKey } from "@/i18n/types";

/** Radio value for betting the wallet — i.e. no grant bound. */
export const REAL_MONEY_ID = "real-money";

/** Shared `name`, so every row in the modal is one radio group. */
export const FREE_BET_GROUP = "free-bet";

/** Translation keys for the column headings above each value in a card. */
export const FreeBetLabel = {
  Type: "freeBets.labels.type",
  BetAmount: "freeBets.labels.betAmount",
  BetRange: "freeBets.labels.betRange",
  Remaining: "freeBets.labels.remaining",
  Completed: "freeBets.labels.completed",
  Accrued: "freeBets.labels.accrued",
  MinWithdrawal: "freeBets.labels.minWithdrawal",
  ExpirationDate: "freeBets.labels.expirationDate",
} as const satisfies Record<string, TranslationKey>;

export type FreeBetLabel = (typeof FreeBetLabel)[keyof typeof FreeBetLabel];

/** Translation key for a grant's kind. */
export const KIND_LABEL_KEYS = {
  fixed: "freeBets.kinds.fixed",
  range: "freeBets.kinds.range",
} as const satisfies Record<string, TranslationKey>;
