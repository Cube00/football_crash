import { cx } from "@/utils";
import styles from "./Balance.module.css";
import { BALANCE_DEFAULTS } from "./Balance.constants";
import type { BalanceProps } from "./Balance.types";

/**
 * Grouped rather than a bare `toFixed(2)` like the bet amounts: a balance runs
 * to four or five digits, where "1,250.00" reads at a glance and "1250.00"
 * does not.
 */
const amountFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const Balance = ({
  amount,
  currency,
  label = BALANCE_DEFAULTS.label,
  className,
  ...rest
}: BalanceProps) => {
  return (
    <div className={cx(styles["balance"], className)} {...rest}>
      <span className={styles["balance__label"]}>{label}</span>
      <span className={styles["balance__value"]}>
        {amountFormat.format(amount)} {currency}
      </span>
    </div>
  );
};
