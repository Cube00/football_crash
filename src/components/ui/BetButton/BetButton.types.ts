import type { Size } from "@/constants";
import type { BetButtonVariant } from "./BetButton.constants";

export interface BetButtonProps {
  variant?: BetButtonVariant;
  size?: Size;
  label?: string;
  amount?: string;
  currency?: string;
  className?: string;
  text?: string;
}
