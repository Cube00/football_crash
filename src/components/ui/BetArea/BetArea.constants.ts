import type { TranslationKey } from "@/i18n/types";
import { MAX_STAKE_SHORTCUT, QUICK_STAKES } from "@/game/display";

/**
 * Quick-select chips shown under the amount stepper. Each chip carries the
 * amount it sets and how to label it — a plain numeral, or a translation key
 * for the word chips.
 *
 * TODO(sdk): `GameConfig` may carry the operator's own quick stakes. If it
 * does, build this from `useGameConfig()` and keep these only as the fallback.
 */
export const AMOUNT_PRESETS: ReadonlyArray<{
  label?: string;
  labelKey?: TranslationKey;
  value: number;
}> = [
  ...QUICK_STAKES.map((value) => ({ label: String(value), value })),
  { labelKey: "bet.presetMax", value: MAX_STAKE_SHORTCUT },
];
