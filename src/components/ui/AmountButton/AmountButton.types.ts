import type { ButtonHTMLAttributes } from "react";
import type { Size } from "@/constants";

export interface AmountButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: Size;
  active?: boolean;
}
