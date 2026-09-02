import type { TranslationKey } from "@/i18n/types";
import { MultiplierButtonVariant } from "../MultiplierButton";

export const StatsTab = {
  Stats: "stats",
  Chart: "chart",
} as const;

export type StatsTab = (typeof StatsTab)[keyof typeof StatsTab];

export const STATS_TABS: ReadonlyArray<{ labelKey: TranslationKey; value: string }> =
  [
    { labelKey: "stats.stats", value: StatsTab.Stats },
    { labelKey: "stats.chart", value: StatsTab.Chart },
  ];

export const ROUNDS_OPTIONS = [50, 100, 200, 300] as const;

export const STATS_DEFAULTS = {
  rounds: 50,
} as const;

/** Colour ladder — a bigger multiplier gets a hotter variant. */
export const MULTIPLIER_THRESHOLDS = [
  { min: 50, variant: MultiplierButtonVariant.Green },
  { min: 20, variant: MultiplierButtonVariant.Yellow },
  { min: 10, variant: MultiplierButtonVariant.Blue },
  { min: 2, variant: MultiplierButtonVariant.LightBlue },
  { min: 0, variant: MultiplierButtonVariant.White },
];
