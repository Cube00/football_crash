import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import type { BetSlot } from "@/sdk";

export interface BetAreaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "slot"> {
  /** Which of the two independent bet slots this area controls. */
  slot: BetSlot;
  /**
   * Locks the slot out of starting another free bet because the grant has no
   * unreserved bets left. A house policy, not an SDK rule — see
   * `isSlotFreebetLocked`, and note it needs both slots, so only the screen
   * that renders them can work it out.
   */
  freebetLocked?: boolean;
}

export interface FreeBetAmountProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Stake per bet, already formatted for display. */
  amount: string;
  currency: string;
  /** Bets still on the grant, and how many it started with. */
  remaining: number;
  total: number;
}
