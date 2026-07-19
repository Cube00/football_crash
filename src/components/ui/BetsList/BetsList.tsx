import { cx } from "@/utils";
import styles from "./BetsList.module.css";
import {
  BETS_LIST_DEFAULTS,
  BetsListVariant,
  BetStatus,
  MOCK_BETS,
} from "./BetsList.constants";
import type { BetsListProps } from "./BetsList.types";

export const BetsList = ({
  rows = MOCK_BETS,
  currency = BETS_LIST_DEFAULTS.currency,
  variant = BetsListVariant.All,
  className,
  ...rest
}: BetsListProps) => {
  const isMyBets = variant === BetsListVariant.My;

  return (
    <div className={cx(styles["bets-list"], className)} {...rest}>
      <div className={styles["bets-list__head"]}>
        <span className={styles["bets-list__head-cell"]}>Player</span>
        <span className={styles["bets-list__head-cell"]}>Bet ({currency})</span>
        <span className={styles["bets-list__head-cell"]}>
          Cashout ({currency})
        </span>
      </div>

      <div className={styles["bets-list__rows"]}>
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
                  alt="verified"
                />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
