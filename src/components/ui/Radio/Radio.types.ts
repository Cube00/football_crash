import type { InputHTMLAttributes, ReactNode } from "react";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Rendered next to the mark, inside the same label, so it is clickable too. */
  children?: ReactNode;
  className?: string;
}
