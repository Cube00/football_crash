import type { TranslationKey } from "@/i18n/types";

export const InfoTab = {
  AllBets: "all-bets",
  MyBets: "my-bets",
  Stats: "stats",
} as const;

export type InfoTab = (typeof InfoTab)[keyof typeof InfoTab];

/** Labels stay as keys here — the tab row translates them at render time. */
export const INFO_TABS: ReadonlyArray<{ labelKey: TranslationKey; value: string }> = [
  { labelKey: "infoTabs.allBets", value: InfoTab.AllBets },
  { labelKey: "infoTabs.myBets", value: InfoTab.MyBets },
  { labelKey: "infoTabs.stats", value: InfoTab.Stats },
];
