import { cx } from "@/utils";
import styles from "./CountdownBar.module.css";
import { COUNTDOWN_BAR_DEFAULTS } from "./CountdownBar.constants";
import type { CountdownBarProps } from "./CountdownBar.types";

/** "Next round in N" over a draining bar, shown while betting is open. */
export const CountdownBar = ({
  remainingMs,
  totalMs,
  label = COUNTDOWN_BAR_DEFAULTS.label,
  className,
  ...rest
}: CountdownBarProps) => {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;

  return (
    <div className={cx(styles["countdown-bar"], className)} {...rest}>
      <span className={styles["countdown-bar__label"]}>
        {label} {seconds}
      </span>
      <span className={styles["countdown-bar__track"]}>
        <span
          className={styles["countdown-bar__fill"]}
          style={{ width: `${progress * 100}%` }}
        />
      </span>
    </div>
  );
};
