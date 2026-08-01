import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import styles from "./FreeBetAmount.module.css";
import type { FreeBetAmountProps } from "./BetArea.types";

/**
 * Stands in for the stepper while a free bet is staked: the stake is the
 * grant's, not the player's to pick, so the control is a readout — what each
 * bet costs the grant, and how much of the grant is left.
 *
 * It is a button, not a panel: the grants list is where the stake was chosen,
 * and this is the only thing on screen that can lead back to it.
 */
export const FreeBetAmount = ({
  price,
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
      {price} {currency}
    </span>
    <span className={styles["free-bet-amount__count"]}>
      {remaining}/{total}
    </span>
  </button>
);
