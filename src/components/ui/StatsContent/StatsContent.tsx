import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { Size } from "@/constants";
import { Tabs, TabsVariant } from "../Tabs";
import { MultiplierButton, MultiplierButtonVariant } from "../MultiplierButton";
import { MultiplierDistribution } from "../MultiplierDistribution";
import { ConnectionState, useConnectionStatus } from "@/sdk";
import { useCrashHistory } from "@/hooks";
import styles from "./StatsContent.module.css";
import {
  MULTIPLIER_THRESHOLDS,
  ROUNDS_OPTIONS,
  STATS_DEFAULTS,
  STATS_TABS,
  StatsTab,
} from "./StatsContent.constants";
import type { StatsContentProps } from "./StatsContent.types";

const variantFor = (multiplier: number): MultiplierButtonVariant =>
  MULTIPLIER_THRESHOLDS.find(({ min }) => multiplier >= min)?.variant ??
  MultiplierButtonVariant.White;

/**
 * Crash statistics: the same finished rounds as a grid of pills and as a
 * distribution across multiplier bands.
 *
 * The window is the server's, not a slice taken here. `getHistory(limit)` is
 * how many rounds to send, so the rounds selector asks for a new list rather
 * than trimming the one it has — a client-side slice can only ever shrink what
 * arrived, and what arrives by default is fifty.
 *
 * The bands and their percentages are the skin's: no endpoint computes them,
 * and the SDK says so plainly.
 */
export const StatsContent = ({ className, ...rest }: StatsContentProps) => {
  const { t } = useTranslation();
  const { rounds: history, fetch } = useCrashHistory();
  const { state } = useConnectionStatus();

  const [activeTab, setActiveTab] = useState<string>(StatsTab.Stats);
  const [rounds, setRounds] = useState<number>(STATS_DEFAULTS.rounds);

  // Also on reconnect: JoinCrashOk re-requests the default fifty, which would
  // silently shrink a window the player had widened.
  useEffect(() => {
    if (state === ConnectionState.Connected) fetch(rounds);
  }, [fetch, rounds, state]);

  const crashes = useMemo(
    () => history.map((round) => round.crashAt),
    [history],
  );
  // The grid reads newest first, the chart oldest first.
  const chart = useMemo(() => [...crashes].reverse(), [crashes]);

  const tabs = useMemo(
    () => STATS_TABS.map(({ labelKey, value }) => ({ label: t(labelKey), value })),
    [t],
  );

  return (
    <div className={cx(styles["stats-content"], className)} {...rest}>
      <Tabs
        items={tabs}
        value={activeTab}
        onValueChange={setActiveTab}
        variant={TabsVariant.Text}
      />

      {activeTab === StatsTab.Stats ? (
        <div className={styles["stats-content__grid"]}>
          {history.map((round) => (
            <MultiplierButton
              key={round.roundId}
              label={`${round.crashAt.toFixed(2)}x`}
              variant={variantFor(round.crashAt)}
              size={Size.Web}
            />
          ))}
        </div>
      ) : (
        <MultiplierDistribution data={chart} />
      )}

      <div className={styles["stats-content__footer"]}>
        <span className={styles["stats-content__label"]}>
          {t("stats.rounds")}
        </span>

        <div className={styles["stats-content__rounds"]}>
          {ROUNDS_OPTIONS.map((option) => (
            <button
              key={option}
              className={cx(
                styles["stats-content__round"],
                option === rounds && styles["stats-content__round--active"],
              )}
              aria-pressed={option === rounds}
              onClick={() => setRounds(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
