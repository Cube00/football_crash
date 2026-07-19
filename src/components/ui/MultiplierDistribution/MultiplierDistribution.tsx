import { useMemo } from "react";
import { cx } from "@/utils";
import styles from "./MultiplierDistribution.module.css";
import { DISTRIBUTION_BUCKETS } from "./MultiplierDistribution.constants";
import type { MultiplierDistributionProps } from "./MultiplierDistribution.types";

export const MultiplierDistribution = ({
  data,
  buckets = DISTRIBUTION_BUCKETS,
  className,
  ...rest
}: MultiplierDistributionProps) => {
  const rows = useMemo(
    () =>
      buckets.map((bucket) => {
        const hits = data.filter(
          (multiplier) => multiplier >= bucket.min && multiplier <= bucket.max,
        ).length;

        return {
          ...bucket,
          percent: data.length ? Math.round((hits / data.length) * 100) : 0,
        };
      }),
    [data, buckets],
  );

  return (
    <div className={cx(styles["multiplier-distribution"], className)} {...rest}>
      {rows.map((row) => (
        <div key={row.label} className={styles["multiplier-distribution__row"]}>
          <div className={styles["multiplier-distribution__head"]}>
            <span className={styles["multiplier-distribution__label"]}>
              {row.label}
            </span>
            <span className={styles["multiplier-distribution__percent"]}>
              {row.percent}%
            </span>
          </div>

          <div className={styles["multiplier-distribution__track"]}>
            <div
              className={styles["multiplier-distribution__fill"]}
              style={{ width: `${row.percent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
