import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "@/components/ui/Tabs";
import {
  BetsList,
  BetsListVariant,
  BetStatus,
} from "@/components/ui/BetsList";
import type { BetRow } from "@/components/ui/BetsList";
import { StatsContent } from "@/components/ui/StatsContent";
import { BetState, useGameConfig, useMyBets } from "@/sdk";
import type { BetUpdatePayload, MyHistoryRound } from "@/sdk";
import { FALLBACK_CURRENCY } from "@/game/display";
import { useRoundBets } from "@/hooks";
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
  status: statusFor(bet.state),
  multiplier: bet.cashedOutAt,
  cashout: bet.payout,
  own: bet.own,
});

/** The player's own settled bets, as returned by `useMyBets()`. */
const toMyRow = (round: MyHistoryRound): BetRow => ({
  id: round.betId,
  bet: round.amount,
  status: statusFor(round.state),
  multiplier: round.cashedOutAt,
  cashout: round.payout,
  own: true,
});

export const InfoSection = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(InfoTab.AllBets);
  const currency = useGameConfig()?.currency ?? FALLBACK_CURRENCY;
  const bets = useRoundBets();
  const rows = useMemo(() => bets.map(toRow), [bets]);

  const { rounds: myRounds, fetch: fetchMyBets } = useMyBets();
  const myRows = useMemo(() => myRounds.map(toMyRow), [myRounds]);

  // The server does not push the player's own history — it answers a request,
  // so ask when the tab that shows it is opened.
  useEffect(() => {
    if (activeTab === InfoTab.MyBets) fetchMyBets();
  }, [activeTab, fetchMyBets]);

  const tabs = useMemo(
    () => INFO_TABS.map(({ labelKey, value }) => ({ label: t(labelKey), value })),
    [t],
  );

  return (
    <div className={styles["info-section"]}>
      <Tabs items={tabs} value={activeTab} onValueChange={setActiveTab} />

      <div className={styles["info-section__content"]}>
        {activeTab === InfoTab.AllBets && (
          <BetsList currency={currency} rows={rows} />
        )}
        {activeTab === InfoTab.MyBets && (
          <BetsList
            currency={currency}
            variant={BetsListVariant.My}
            rows={myRows}
          />
        )}
        {activeTab === InfoTab.Stats && <StatsContent />}
      </div>
    </div>
  );
};
