import type { ButtonHTMLAttributes } from "react";
import type { Size } from "@/constants";
import type { btnVariants } from "./PlayNowButton.constants";

export interface PlayNowButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: btnVariants;
  size?: Size;
}
