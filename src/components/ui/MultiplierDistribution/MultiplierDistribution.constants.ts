import type { DistributionBucket } from "./MultiplierDistribution.types";

export const DISTRIBUTION_BUCKETS: DistributionBucket[] = [
  { label: "1x", min: 1, max: 1 },
  { label: "1.01x - 1.99x", min: 1.01, max: 1.99 },
  { label: "2x - 5.99x", min: 2, max: 5.99 },
  { label: "6x - 25.99x", min: 6, max: 25.99 },
  { label: "26x - 100.99x", min: 26, max: 100.99 },
  { label: "101x - 4 999.99x", min: 101, max: 4999.99 },
  { label: "5 000x", min: 5000, max: Infinity },
];
