import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import type { BetSlot } from "@/game/enums";

export interface BetAreaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "slot"> {
  /** Which of the two independent bet slots this area controls. */
  slot: BetSlot;
  /** Currency label shown on the Bet button. */
  currency?: string;
}

export interface FreeBetAmountProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Stake per bet, already formatted for display. */
  price: string;
  currency: string;
  remaining: number;
  total: number;
}
