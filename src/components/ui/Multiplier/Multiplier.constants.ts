/** How many multiplier pills to show per breakpoint, sorted widest first. */
export const MULTIPLIER_BREAKPOINTS = [
  { minWidth: 1024, count: 15 }, // desktop
  { minWidth: 768, count: 12 }, // tablet
  { minWidth: 0, count: 8 }, // mobile
] as const;

/** Count used before the viewport width is known (matches desktop). */
export const DEFAULT_MULTIPLIER_COUNT = MULTIPLIER_BREAKPOINTS[0].count;

/** Largest count across all breakpoints — how many variants we pre-generate. */
export const MAX_MULTIPLIERS = Math.max(
  ...MULTIPLIER_BREAKPOINTS.map((breakpoint) => breakpoint.count),
);
