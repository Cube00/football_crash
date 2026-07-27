/** One free bet the player can stake instead of their own balance. */
export interface FreeBet {
  id: string;
  /** Free bet flavour, shown under the TYPE column. */
  type: string;
  /** Bets used out of the granted total, e.g. `10/10`. */
  betAmount: string;
  /** Stake per bet. Bonus balance grants have none, so the column is dropped. */
  betPrice?: string;
  /** When the grant landed. */
  accrued: string;
  /** Multiplier the player has to reach before cashing out. */
  minWithdrawal: string;
  /** When the grant stops being playable. */
  expiresAt: string;
}

export interface FreeBetCardProps {
  bet: FreeBet;
  /** Whether this bet is the staked one. */
  checked: boolean;
  /** Whether the accrual details are open. */
  expanded: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}
