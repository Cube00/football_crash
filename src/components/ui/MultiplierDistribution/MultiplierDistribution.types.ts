import type { HTMLAttributes } from "react";

export interface DistributionBucket {
  label: string;
  min: number;
  max: number;
}

export interface MultiplierDistributionProps extends HTMLAttributes<HTMLDivElement> {
  /** Crash multiplier per round — bucketed into the ranges below. */
  data: number[];
  buckets?: DistributionBucket[];
}
