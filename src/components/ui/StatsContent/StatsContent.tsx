import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { Size } from "@/constants";
import { Tabs, TabsVariant } from "../Tabs";
import { MultiplierButton, MultiplierButtonVariant } from "../MultiplierButton";
import { MultiplierDistribution } from "../MultiplierDistribution";
import styles from "./StatsContent.module.css";
import {
  MOCK_MULTIPLIERS,
  MOCK_ROUNDS,
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

export const StatsContent = ({
  multipliers = MOCK_MULTIPLIERS,
  roundsHistory = MOCK_ROUNDS,
  rounds,
  onRoundsChange,
  className,
  ...rest
}: StatsContentProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(StatsTab.Stats);
  const [internalRounds, setInternalRounds] = useState<number>(
    STATS_DEFAULTS.rounds,
  );
  const activeRounds = rounds ?? internalRounds;

  const tabs = useMemo(
    () => STATS_TABS.map(({ labelKey, value }) => ({ label: t(labelKey), value })),
    [t],
  );

  const selectRounds = (next: number) => {
    setInternalRounds(next);
    onRoundsChange?.(next);
  };

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
          {multipliers.map((multiplier, index) => (
            <MultiplierButton
              key={index}
              label={`${multiplier.toFixed(2)}x`}
              variant={variantFor(multiplier)}
              size={Size.Web}
            />
          ))}
        </div>
      ) : (
        <MultiplierDistribution data={roundsHistory.slice(-activeRounds)} />
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
                option === activeRounds &&
                  styles["stats-content__round--active"],
              )}
              onClick={() => selectRounds(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
