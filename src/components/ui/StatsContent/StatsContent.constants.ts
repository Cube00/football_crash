import type { TabItem } from "../Tabs";
import { MultiplierButtonVariant } from "../MultiplierButton";

export const StatsTab = {
  Stats: "stats",
  Chart: "chart",
} as const;

export type StatsTab = (typeof StatsTab)[keyof typeof StatsTab];

export const STATS_TABS: TabItem[] = [
  { label: "Stats", value: StatsTab.Stats },
  { label: "Chart", value: StatsTab.Chart },
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

const PATTERN = [1.12, 2.4, 11.5, 34.12, 56.4, 1.12];

export const MOCK_MULTIPLIERS: number[] = Array.from(
  { length: 120 },
  (_, index) => PATTERN[index % PATTERN.length],
);

/** Seeded so the mock history stays put across re-renders. */
const randomFor = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Crash multipliers follow a 1/(1-u) tail: mostly low, rarely huge. */
const crashMultiplier = (random: () => number) => {
  const value = 0.99 / (1 - random());
  return Math.min(Math.max(Math.round(value * 100) / 100, 1), 150);
};

const random = randomFor(20260717);

export const MOCK_ROUNDS: number[] = Array.from(
  { length: Math.max(...ROUNDS_OPTIONS) },
  () => crashMultiplier(random),
);
