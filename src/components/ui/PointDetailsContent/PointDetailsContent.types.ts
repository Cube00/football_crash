import type { CrashHistoryItemPayload } from "@/game/events";

export interface PointDetailsContentProps {
  /** The round whose pill was tapped. Sample data stands in when absent. */
  point?: CrashHistoryItemPayload;
}
