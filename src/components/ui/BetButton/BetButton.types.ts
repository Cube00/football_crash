import type { ButtonHTMLAttributes } from "react";
import type { Size } from "@/constants";
import type { BetButtonVariant } from "@/sdk";

export interface BetButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Comes from `slotState.buttonVariant` — never derived in the UI. */
  variant?: BetButtonVariant;
  size?: Size;
  label?: string;
  amount?: string;
  currency?: string;
  /** Replaces the amount/currency row with a single line of text. */
  text?: string;
}
