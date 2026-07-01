import { cx } from "../../../utils";
import styles from "./BetButton.module.css";
import type { BetButtonProps } from "./BetButton.types";

export const BetButton = ({
  label,
  variant,
  size,
  className,
  currency,
  amount,
  text,
  ...rest
}: BetButtonProps) => {
  const classes = cx(
    styles["bet-button"],
    styles[`bet-button--${variant}`],
    styles[`bet-button--${size}`],
    className,
  );

  return (
    <button className={classes} {...rest}>
      <span className={styles["bet-button__label"]}>{label}</span>
      <span className={styles["bet-button__money"]}>
        {text ? (
          <span className={styles["bet-button__text"]}>{text}</span>
        ) : (
          <>
            <span>{amount}</span>
            <span>{currency}</span>
          </>
        )}
      </span>
    </button>
  );
};
