import { cx } from "@/utils";
import styles from "./MultiplierValue.module.css";
import type { MultiplierValueProps } from "./MultiplierValue.types";

/**
 * The round's live multiplier. The number and its "x" are separate spans so the
 * two type sizes can share a baseline.
 */
export const MultiplierValue = ({
  value,
  crashed = false,
  className,
  ...rest
}: MultiplierValueProps) => {
  return (
    <div
      className={cx(
        styles["multiplier-value"],
        crashed && styles["multiplier-value--crashed"],
        className,
      )}
      {...rest}
    >
      <span className={styles["multiplier-value__number"]}>{value}</span>
      <span className={styles["multiplier-value__suffix"]}>x</span>
    </div>
  );
};
