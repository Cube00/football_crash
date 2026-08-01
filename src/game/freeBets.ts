import type { TranslationKey } from "@/i18n/types";

/**
 * How a grant pays out when the round is cashed out.
 *
 * `FullPayout` settles like a real bet — stake × multiplier. `PureProfit`
 * returns only what the stake earned, since the stake itself was never the
 * player's. `BonusBalance` is a lump sum rather than a stake per round, so it
 * has no per-bet price and cannot be staked as a free bet.
 */
export const FreeBetPayout = {
  FullPayout: "full-payout",
  PureProfit: "pure-profit",
  BonusBalance: "bonus-balance",
} as const;

export type FreeBetPayout =
  (typeof FreeBetPayout)[keyof typeof FreeBetPayout];

export interface FreeBetGrant {
  id: string;
  payout: FreeBetPayout;
  /** Translation key for the flavour shown under the TYPE column. */
  typeKey: TranslationKey;
  /**
   * Stake each bet costs the grant. Bonus balance grants have none — they are
   * a pot, not a book of tickets — which is what makes them unstakeable here.
   */
  price?: number;
  /** Lump sum, for grants that carry one instead of a per-bet price. */
  amount?: number;
  currency: string;
  /** Bets granted, and how many of them are already spent. */
  total: number;
  used: number;
  /** The multiplier a free bet has to reach before it can be cashed out. */
  minCashout: number;
  accruedAt: string;
  expiresAt: string;
}

/** Bets still on the grant. */
export const remainingOf = (grant: FreeBetGrant): number =>
  Math.max(0, grant.total - grant.used);

/** Whether the grant can be staked round by round. */
export const isStakeable = (grant: FreeBetGrant): boolean =>
  grant.price != null && remainingOf(grant) > 0;

/** Placeholder grants until the wallet API is wired up. */
export const INITIAL_GRANTS: readonly FreeBetGrant[] = [
  {
    id: "full-payout",
    payout: FreeBetPayout.FullPayout,
    typeKey: "freeBets.types.fullPayout",
    price: 0.5,
    currency: "USD",
    total: 50,
    used: 10,
    minCashout: 3.5,
    accruedAt: "11 Feb, 2026 08:57",
    expiresAt: "09 Feb, 2026 22:11",
  },
  {
    id: "pure-profit",
    payout: FreeBetPayout.PureProfit,
    typeKey: "freeBets.types.pureProfit",
    price: 0.5,
    currency: "USD",
    total: 10,
    used: 0,
    minCashout: 3.5,
    accruedAt: "11 Feb, 2026 08:57",
    expiresAt: "09 Feb, 2026 22:11",
  },
  {
    id: "bonus-balance",
    payout: FreeBetPayout.BonusBalance,
    typeKey: "freeBets.types.bonusBalance",
    amount: 30,
    currency: "USD",
    total: 1,
    used: 0,
    minCashout: 3.5,
    accruedAt: "11 Feb, 2026 08:57",
    expiresAt: "09 Feb, 2026 22:11",
  },
];
