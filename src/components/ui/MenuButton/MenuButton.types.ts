import type { ButtonHTMLAttributes } from "react";

export interface MenuButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Menu is showing: the burger becomes a cross and the ring turns on. */
  open?: boolean;
  className?: string;
}
