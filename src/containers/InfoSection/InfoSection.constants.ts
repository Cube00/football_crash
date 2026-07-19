import type { TabItem } from "@/components/ui/Tabs";

export const InfoTab = {
  AllBets: "all-bets",
  MyBets: "my-bets",
  Stats: "stats",
} as const;

export type InfoTab = (typeof InfoTab)[keyof typeof InfoTab];

export const INFO_TABS: TabItem[] = [
  { label: "All bets", value: InfoTab.AllBets },
  { label: "My Bets", value: InfoTab.MyBets },
  { label: "Stats", value: InfoTab.Stats },
];
