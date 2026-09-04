import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./BetsSummaryBar.module.css";
import { BETS_LIST_DEFAULTS } from "./BetsList.constants";
import type { BetsSummary } from "./BetsList.types";

/** Formats an amount as `1.436.24` — dot-grouped thousands, operator decimals. */
const formatAmount = (value: number, decimals: number) => {
  const [whole, fraction] = value.toFixed(decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? `${grouped}.${fraction}` : grouped;
};

interface BetsSummaryBarProps {
  summary: BetsSummary;
  currency?: string;
  decimals?: number;
  className?: string;
}

/**
 * The round's totals, as a bar pinned to the bottom.
 *
 * It lives outside {@link BetsList} because it outlives it: on mobile the bar
 * belongs to the screen rather than to whichever tab is open, so the Stats tab
 * — which does not render a bets list at all — mounts its own copy. Only ever
 * one is on screen, since the tabs are exclusive.
 */
export const BetsSummaryBar = ({
  summary,
  currency = BETS_LIST_DEFAULTS.currency,
  decimals = BETS_LIST_DEFAULTS.decimals,
  className,
}: BetsSummaryBarProps) => {
  const { t } = useTranslation();

  return (
    <div className={cx(styles["bets-summary-bar"], className)}>
      <div className={styles["bets-summary-bar__item"]}>
        <span className={styles["bets-summary-bar__label"]}>
          {t("betsList.bets")}
        </span>
        <span className={styles["bets-summary-bar__value"]}>
          {summary.placed}/{summary.total}
        </span>
      </div>

      <div className={styles["bets-summary-bar__item"]}>
        <span className={styles["bets-summary-bar__label"]}>
          {t("betsList.totalBets")}
        </span>
        <span className={styles["bets-summary-bar__value"]}>
          {formatAmount(summary.totalBet, decimals)} {currency}
        </span>
      </div>

      <div
        className={cx(
          styles["bets-summary-bar__item"],
          styles["bets-summary-bar__item--end"],
        )}
      >
        <span className={styles["bets-summary-bar__label"]}>
          {t("betsList.totalWin")}
        </span>
        <span className={styles["bets-summary-bar__value"]}>
          {formatAmount(summary.totalWin, decimals)} {currency}
        </span>
      </div>
    </div>
  );
};
