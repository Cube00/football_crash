export const BET_AREA_DEFAULTS = {
  amount: 1,
  multiplier: 2,
  currency: "USD",
} as const;

/** Highest stake, applied by the "Max" chip. */
export const MAX_BET_AMOUNT = 9999;

/**
 * Quick-select chips shown under the amount stepper. Each chip carries the
 * text to display and the amount it sets.
 */
export const AMOUNT_PRESETS = [
  { label: "2", value: 2 },
  { label: "4", value: 4 },
  { label: "6", value: 6 },
  { label: "Max", value: MAX_BET_AMOUNT },
] as const;
