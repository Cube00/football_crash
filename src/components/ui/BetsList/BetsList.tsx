import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./BetsList.module.css";
import {
  BETS_LIST_DEFAULTS,
  BetsListVariant,
  BetStatus,
  MOCK_BETS,
  MOCK_MY_BETS_SUMMARY,
} from "./BetsList.constants";
import type { BetsListProps } from "./BetsList.types";
import { BetsSummaryBar } from "./BetsSummaryBar";

export const BetsList = ({
  rows = MOCK_BETS,
  summary = MOCK_MY_BETS_SUMMARY,
  currency = BETS_LIST_DEFAULTS.currency,
  variant = BetsListVariant.All,
  className,
  ...rest
}: BetsListProps) => {
  const { t } = useTranslation();
  const isMyBets = variant === BetsListVariant.My;

  return (
    <div className={cx(styles["bets-list"], className)} {...rest}>
      <div className={styles["bets-list__head"]}>
        <span className={styles["bets-list__head-cell"]}>
          {t("betsList.player")}
        </span>
        <span className={styles["bets-list__head-cell"]}>
          {t("betsList.bet", { currency })}
        </span>
        <span className={styles["bets-list__head-cell"]}>
          {t("betsList.cashout", { currency })}
        </span>
      </div>

      <div className={cx(styles["bets-list__rows"], styles["bets-list__authorized"])}>
        {rows.map((row) => (
          <div
            key={row.id}
            className={cx(
              styles["bets-list__row"],
              styles[`bets-list__row--${row.status}`],
              row.own && styles["bets-list__row--own"],
            )}
          >
            {isMyBets ? (
              <span
                className={cx(
                  styles["bets-list__cell"],
                  styles["bets-list__date"],
                )}
              >
                {row.date}
                <span className={styles["bets-list__time"]}>{row.time}</span>
              </span>
            ) : (
              <span
                className={cx(
                  styles["bets-list__cell"],
                  styles["bets-list__player"],
                )}
              >
                {row.player}
              </span>
            )}

            <span
              className={cx(
                styles["bets-list__cell"],
                styles["bets-list__bet"],
              )}
            >
              {row.bet.toFixed(2)}
              {row.status === BetStatus.CashedOut && row.multiplier != null && (
                <span className={styles["bets-list__badge"]}>
                  {row.multiplier.toFixed(2)}x
                </span>
              )}
            </span>

            <span
              className={cx(
                styles["bets-list__cell"],
                styles["bets-list__cashout"],
              )}
            >
              {row.cashout != null
                ? row.cashout.toFixed(3)
                : BETS_LIST_DEFAULTS.emptyValue}
              {isMyBets && row.status === BetStatus.CashedOut && (
                <img
                  className={styles["bets-list__icon"]}
                  src="/assets/icons/Check.svg"
                  alt={t("a11y.verified")}
                />
              )}
            </span>
          </div>
        ))}
      </div>
      {/* Shown on both variants, not just My Bets, despite the class name. */}
      <BetsSummaryBar summary={summary} currency={currency} />
    </div>
  );
};
