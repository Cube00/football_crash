import type { ButtonHTMLAttributes } from "react";
import type { Size } from "@/constants";

export interface AmountButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string | number;
  size?: Size;
  active?: boolean;
}
