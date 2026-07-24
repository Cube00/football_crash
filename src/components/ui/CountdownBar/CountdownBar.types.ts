import type { HTMLAttributes } from "react";

export interface CountdownBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Time left in the window, in ms. */
  remainingMs: number;
  /** Full length of the window, for the bar's fill. */
  totalMs: number;
  /** Text before the seconds count. */
  label?: string;
}
