import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import {
  BetsList,
  BetsListVariant,
  MOCK_MY_BETS,
} from "@/components/ui/BetsList";
import { StatsContent } from "@/components/ui/StatsContent";
import styles from "./InfoSection.module.css";
import { INFO_TABS, InfoTab } from "./InfoSection.constants";

export const InfoSection = () => {
  const [activeTab, setActiveTab] = useState<string>(InfoTab.AllBets);

  return (
    <div className={styles["info-section"]}>
      <Tabs items={INFO_TABS} value={activeTab} onValueChange={setActiveTab} />

      <div className={styles["info-section__content"]}>
        {activeTab === InfoTab.AllBets && <BetsList currency="USD" />}
        {activeTab === InfoTab.MyBets && (
          <BetsList
            currency="USD"
            variant={BetsListVariant.My}
            rows={MOCK_MY_BETS}
          />
        )}
        {activeTab === InfoTab.Stats && <StatsContent />}
      </div>
    </div>
  );
};
