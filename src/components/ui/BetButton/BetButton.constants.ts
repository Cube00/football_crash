export const BetButtonVariant = {
  Bet: "bet",
  Cancel: "cancel",
  Cashout: "cashout",
  Freebet: "freebet",
} as const;

export type BetButtonVariant =
  (typeof BetButtonVariant)[keyof typeof BetButtonVariant];
