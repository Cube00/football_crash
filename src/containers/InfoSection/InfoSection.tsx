import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "@/components/ui/Tabs";
import { BetsList, BetsListVariant, BetStatus } from "@/components/ui/BetsList";
import type { BetRow, BetsSummary } from "@/components/ui/BetsList";
import { StatsContent } from "@/components/ui/StatsContent";
import { useMyBets } from "@/sdk";
import type { BetUpdatePayload, MyHistoryRound } from "@/sdk";
import { useMoney, useRoundBets } from "@/hooks";
import styles from "./InfoSection.module.css";
import { INFO_TABS, InfoTab } from "./InfoSection.constants";

/** How many settled rounds the My Bets tab asks for. */
const MY_BETS_LIMIT = 50;

/**
 * A feed row's outcome.
 *
 * `status` is a free-form string the SDK does not type, and the one reliable
 * test is the payout: the server sends the cashout multiplier and the amount
 * together, so an amount above zero is a cashed-out bet whatever the status
 * says. Everything else is still in play — the feed clears at the next round,
 * so nothing sits in it long enough to be called lost.
 */
const statusFor = (bet: BetUpdatePayload): BetStatus =>
  bet.payout != null && bet.payout > 0 ? BetStatus.CashedOut : BetStatus.Pending;

/**
 * A player name for the feed.
 *
 * `username` is often empty — the server masks players — so the fallback ladder
 * is the documented one: the user id with its middle starred out, then the
 * per-round identifier, which is always there.
 */
const displayName = (bet: BetUpdatePayload, own: boolean, you: string) => {
  if (own) return you;
  if (bet.username) return bet.username;
  if (bet.userId != null) {
    const id = String(bet.userId);
    return id.length <= 2 ? id : `${id[0]}${"*".repeat(id.length - 2)}${id.at(-1)}`;
  }
  return bet.fakeIdentifier;
};

export const InfoSection = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(InfoTab.AllBets);
  const { currency, decimals } = useMoney();

  const { rows: bets, ownIdentifier } = useRoundBets();
  const you = t("betsList.you");

  const rows = useMemo<BetRow[]>(
    () =>
      bets.map((bet) => {
        const own = ownIdentifier != null && bet.fakeIdentifier === ownIdentifier;
        return {
          id: bet.betId,
          player: displayName(bet, own, you),
          bet: bet.amount,
          status: statusFor(bet),
          multiplier: bet.cashedOutAt,
          cashout: bet.payout,
          own,
        };
      }),
    [bets, ownIdentifier, you],
  );

  // Counted here rather than fetched: the round's totals are the rows the feed
  // already holds, and no endpoint publishes them.
  const summary = useMemo<BetsSummary>(() => {
    const cashedOut = bets.filter((bet) => (bet.payout ?? 0) > 0);
    return {
      placed: cashedOut.length,
      total: bets.length,
      totalBet: bets.reduce((sum, bet) => sum + bet.amount, 0),
      totalWin: cashedOut.reduce((sum, bet) => sum + (bet.payout ?? 0), 0),
    };
  }, [bets]);

  const { rounds: myRounds, fetch: fetchMyBets } = useMyBets();

  /**
   * The player's own history is one row per ticket, with the stake and the win
   * already totalled by the SDK; `bets[0]` is the ticket itself and carries the
   * multiplier the win worked out to.
   */
  const myRows = useMemo<BetRow[]>(
    () =>
      myRounds.map((round: MyHistoryRound) => {
        const won = round.totalWin > 0;
        const when = new Date(round.timestamp);
        const valid = !Number.isNaN(when.getTime());
        return {
          id: round.roundId,
          date: valid
            ? when.toLocaleDateString(i18n.language, {
                day: "2-digit",
                month: "short",
              })
            : "",
          time: valid
            ? when.toLocaleTimeString(i18n.language, {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          bet: round.totalBet,
          status: won ? BetStatus.CashedOut : BetStatus.Lost,
          multiplier: won ? round.bets[0]?.multiplier : undefined,
          cashout: won ? round.totalWin : undefined,
          own: true,
        };
      }),
    [myRounds, i18n.language],
  );

  // The server does not push the player's own history — it answers a request,
  // so ask when the tab that shows it is opened.
  useEffect(() => {
    if (activeTab === InfoTab.MyBets) fetchMyBets(MY_BETS_LIMIT);
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
          <BetsList
            currency={currency}
            decimals={decimals}
            rows={rows}
            summary={summary}
          />
        )}
        {activeTab === InfoTab.MyBets && (
          <BetsList
            currency={currency}
            decimals={decimals}
            variant={BetsListVariant.My}
            rows={myRows}
          />
        )}
        {activeTab === InfoTab.Stats && <StatsContent />}
      </div>
    </div>
  );
};
