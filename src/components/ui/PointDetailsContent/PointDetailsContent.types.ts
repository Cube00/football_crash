import type { GameHistoryItem } from "@/sdk";

export interface PointDetailsContentProps {
  /** The finished round whose pill was tapped. */
  point?: GameHistoryItem;
}
