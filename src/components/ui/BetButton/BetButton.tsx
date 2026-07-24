import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import styles from "./BetButton.module.css";
import { BetButtonVariant } from "./BetButton.constants";
import type { BetButtonProps } from "./BetButton.types";

/** Placing, cashing out and cancelling each have their own voice. */
const VARIANT_SOUND: Record<BetButtonVariant, Sound> = {
  [BetButtonVariant.Bet]: Sound.Bet,
  [BetButtonVariant.Freebet]: Sound.Bet,
  [BetButtonVariant.Cashout]: Sound.Cashout,
  [BetButtonVariant.Cancel]: Sound.Cancel,
};

export const BetButton = ({
  label,
  variant,
  size,
  className,
  currency,
  amount,
  text,
  onClick,
  ...rest
}: BetButtonProps) => {
  const classes = cx(
    styles["bet-button"],
    styles[`bet-button--${variant}`],
    styles[`bet-button--${size}`],
    className,
  );

  return (
    <button
      className={classes}
      onClick={(event) => {
        playSound(VARIANT_SOUND[variant ?? BetButtonVariant.Bet]);
        onClick?.(event);
      }}
      {...rest}
    >
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
