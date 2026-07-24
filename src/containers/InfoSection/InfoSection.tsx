import { useMemo, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import {
  BetsList,
  BetsListVariant,
  BetStatus,
  MOCK_MY_BETS,
} from "@/components/ui/BetsList";
import type { BetRow } from "@/components/ui/BetsList";
import { StatsContent } from "@/components/ui/StatsContent";
import { useRoundBets } from "@/hooks/useGame";
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
  const [activeTab, setActiveTab] = useState<string>(InfoTab.AllBets);
  const roundBets = useRoundBets();
  const rows = useMemo(() => roundBets.map(toRow), [roundBets]);

  return (
    <div className={styles["info-section"]}>
      <Tabs items={INFO_TABS} value={activeTab} onValueChange={setActiveTab} />

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
