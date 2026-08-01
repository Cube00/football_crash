import type { FreeBetGrant } from "@/game/freeBets";

export interface FreeBetCardProps {
  bet: FreeBetGrant;
  /** Whether this bet is the staked one. */
  checked: boolean;
  /** Whether the accrual details are open. */
  expanded: boolean;
  /** Whether the grant can be staked round by round at all. */
  stakeable: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}
