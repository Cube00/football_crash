import type { ButtonHTMLAttributes } from "react";
import type { Size } from "@/constants";
import type { MultiplierButtonVariant } from "./MultiplierButton.constants";

export interface MultiplierButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: MultiplierButtonVariant;
  size?: Size | string;
}
