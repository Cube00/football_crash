export const BetButtonSize = {
  Web: "web",
  Mobile: "mobile",
} as const;

export type BetButtonSize = (typeof BetButtonSize)[keyof typeof BetButtonSize];

export const BetButtonVariant = {
  Bet: "bet",
  Cancel: "cancel",
  Cashout: "cashout",
  Freebet: "freebet",
} as const;

export type BetButtonVariant =
  (typeof BetButtonVariant)[keyof typeof BetButtonVariant];

export interface BetButtonProps {
  variant?: BetButtonVariant;
  size?: BetButtonSize;
  label?: string;
  amount?: string;
  currency?: string;
  className?: string;
  text?: string;
}
