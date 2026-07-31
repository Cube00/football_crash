import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "@/components/ui/Tabs";
import {
  BetsList,
  BetsListVariant,
  BetStatus,
  MOCK_MY_BETS,
} from "@/components/ui/BetsList";
import type { BetRow } from "@/components/ui/BetsList";
import { StatsContent } from "@/components/ui/StatsContent";
import { useBets } from "@/hooks/useGame";
import { BetState } from "@/game/enums";
import type { BetUpdatePayload } from "@/game/events";
import styles from "./InfoSection.module.css";
import { INFO_TABS, InfoTab } from "./InfoSection.constants";

const statusFor = (state: BetState): BetStatus => {
  if (state === BetState.Won) return BetStatus.CashedOut;
  if (state === BetState.Lost) return BetStatus.Lost;
  return BetStatus.Pending;
};

const toRow = (bet: BetUpdatePayload): BetRow => ({
  id: bet.betId,
  player: bet.username,
  bet: bet.amount,
  status: statusFor(bet.status),
  multiplier: bet.cashedOutAt,
  cashout: bet.payout,
  own: bet.own,
});

export const InfoSection = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(InfoTab.AllBets);
  const bets = useBets();
  const rows = useMemo(() => bets.map(toRow), [bets]);

  const tabs = useMemo(
    () => INFO_TABS.map(({ labelKey, value }) => ({ label: t(labelKey), value })),
    [t],
  );

  return (
    <div className={styles["info-section"]}>
      <Tabs items={tabs} value={activeTab} onValueChange={setActiveTab} />

      <div className={styles["info-section__content"]}>
        {activeTab === InfoTab.AllBets && (
          <BetsList currency="USD" rows={rows} />
        )}
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
