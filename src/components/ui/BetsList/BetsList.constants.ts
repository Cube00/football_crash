export const BetsListVariant = {
  All: "all",
  My: "my",
} as const;

export type BetsListVariant =
  (typeof BetsListVariant)[keyof typeof BetsListVariant];

export const BetStatus = {
  Pending: "pending",
  CashedOut: "cashedOut",
  Lost: "lost",
} as const;

export type BetStatus = (typeof BetStatus)[keyof typeof BetStatus];

export const BETS_LIST_DEFAULTS = {
  currency: "USD",
  /** Only until `game-config` arrives with the operator's minor units. */
  decimals: 2,
  emptyValue: "-",
} as const;
