import type { ButtonHTMLAttributes } from "react";

export interface FreeBetButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  count: number;
}
