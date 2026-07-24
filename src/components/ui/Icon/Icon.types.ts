import type { HTMLAttributes } from "react";

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Path to a monochrome SVG, e.g. `/assets/icons/Chat.svg`. */
  src: string;
  /** Square size in px. Defaults to 24. */
  size?: number;
}
