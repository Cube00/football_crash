import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import styles from "./FreeBetAmount.module.css";
import type { FreeBetAmountProps } from "./BetArea.types";

/**
 * Stands in for the stepper while a fixed grant is bound: the SDK sends that
 * grant's `betAmount` whatever the input says, so a stepper here would only
 * offer a choice the server ignores.
 *
 * It is a button, not a panel: the grants list is where the bet was bound, and
 * this is the only thing on screen that leads back to it.
 */
export const FreeBetAmount = ({
  amount,
  currency,
  remaining,
  total,
  className,
  onClick,
  ...rest
}: FreeBetAmountProps) => (
  <button
    type="button"
    className={cx(styles["free-bet-amount"], className)}
    onClick={(event) => {
      playSound(Sound.SmallButton);
      onClick?.(event);
    }}
    {...rest}
  >
    <span className={styles["free-bet-amount__price"]}>
      {amount} {currency}
    </span>
    <span className={styles["free-bet-amount__count"]}>
      {remaining}/{total}
    </span>
  </button>
);
