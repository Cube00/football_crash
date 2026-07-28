import type { TranslationKey } from "@/i18n/types";

export const BET_AREA_DEFAULTS = {
  amount: 1,
  multiplier: 2,
  currency: "USD",
} as const;

/** Highest stake, applied by the "Max" chip. */
export const MAX_BET_AMOUNT = 9999;

/**
 * Quick-select chips shown under the amount stepper. Each chip carries the
 * amount it sets and how to label it — a plain numeral, or a translation key
 * for the word chips.
 */
export const AMOUNT_PRESETS: ReadonlyArray<{
  label?: string;
  labelKey?: TranslationKey;
  value: number;
}> = [
  { label: "2", value: 2 },
  { label: "4", value: 4 },
  { label: "6", value: 6 },
  { labelKey: "bet.presetMax", value: MAX_BET_AMOUNT },
];
