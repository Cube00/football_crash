import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./Balance.module.css";
import type { BalanceProps } from "./Balance.types";

/**
 * Grouped rather than a bare `toFixed()` like the bet amounts: a balance runs
 * to four or five digits, where "1,250.00" reads at a glance and "1250.00"
 * does not.
 *
 * The precision is the operator's — `currencyMinorUnits` from the game config,
 * which is not 2 in every currency — so the formatter is built per value
 * rather than once at module level.
 */
const format = (amount: number, decimals: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

export const Balance = ({
  amount,
  currency,
  decimals = 2,
  label,
  className,
  ...rest
}: BalanceProps) => {
  const { t } = useTranslation();

  return (
    <div className={cx(styles["balance"], className)} {...rest}>
      <span className={styles["balance__label"]}>
        {label ?? t("header.balance")}
      </span>
      <span className={styles["balance__value"]}>
        {format(amount, decimals)} {currency}
      </span>
    </div>
  );
};
