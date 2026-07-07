import type { HTMLAttributes } from "react";
import type { StepperSize } from "./Stepper.constants";

export interface StepperProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Controlled value. */
  value?: number;
  /** Initial value for uncontrolled usage. */
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  /** Number of decimals shown. */
  precision?: number;
  /** Visual variant: large rounded bar or compact pill. */
  size?: StepperSize;
  /** Text appended after the value, e.g. "x". */
  suffix?: string;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
}
