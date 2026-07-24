import type { ButtonHTMLAttributes } from "react";
import type { Size } from "@/constants";
import type { BetButtonVariant } from "./BetButton.constants";

export interface BetButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BetButtonVariant;
  size?: Size;
  label?: string;
  amount?: string;
  currency?: string;
  /** Replaces the amount/currency row with a single line of text. */
  text?: string;
}
