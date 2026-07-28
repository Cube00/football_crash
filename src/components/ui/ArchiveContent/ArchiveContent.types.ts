import type { TranslationKey } from "@/i18n/types";

/** A spent free bet, kept for the record with what it paid out. */
export interface ArchivedFreeBet {
  id: string;
  /** Translation key for the free bet flavour. */
  typeKey: TranslationKey;
  betAmount: string;
  /** Bonus balance grants have no per-bet price, so the column is dropped. */
  betPrice?: string;
  /** Total the grant returned, already formatted with its currency. */
  payout: string;
}
