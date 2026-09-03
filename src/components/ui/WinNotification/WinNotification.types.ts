import type { HTMLAttributes } from "react";

export interface WinNotificationProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onClose"> {
  amount: number;
  currency: string;
  /** The operator's `currencyMinorUnits`. */
  decimals?: number;
  /** Drives the fade-out, so it must match the caller's dismiss timer. */
  durationMs?: number;
  onClose?: () => void;
}
