export const STEPPER_DEFAULTS = {
  min: 0,
  max: Infinity,
  step: 1,
  precision: 2,
  defaultValue: 1,
} as const;

export const StepperSize = {
  Default: "default",
  Compact: "compact",
} as const;

export type StepperSize = (typeof StepperSize)[keyof typeof StepperSize];
