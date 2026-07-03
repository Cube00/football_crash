import type { Size } from "@/constants";
import type { roundsButtonVariants } from "./RoundsButton.constants";

export interface RoundsButtonTypes {
  variant?: roundsButtonVariants;
  size?: Size;
  className?: string;
}
