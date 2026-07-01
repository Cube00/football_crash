import type { Size } from "@/constants";
import type { btnVariants } from "./PlayNowButton.constants";

export interface PlayNowButtonProps {
  variant?: btnVariants;
  size?: Size;
  className?: string;

}
