import { cx } from "@/utils";
import { BetButtonVariant } from "@/sdk";
import { playSound, Sound } from "@/game/sounds";
import styles from "./BetButton.module.css";
import type { BetButtonProps } from "./BetButton.types";

/**
 * Placing, cashing out and cancelling each have their own voice. The
 * in-flight and terminal variants are silent: the click that started them
 * already played, and `Lost` was never a click at all.
 */
const VARIANT_SOUND: Partial<Record<BetButtonVariant, Sound>> = {
  [BetButtonVariant.Bet]: Sound.Bet,
  [BetButtonVariant.Freebet]: Sound.Bet,
  [BetButtonVariant.Cashout]: Sound.Cashout,
  [BetButtonVariant.Cancel]: Sound.Cancel,
};

/**
 * The primary control of a bet slot.
 *
 * It renders the variant it is given and never works one out. The SDK computes
 * `slotState.buttonVariant` and `slotState.isButtonDisabled` from phase, bet
 * state, in-flight flags and the freeze detector; duplicating any part of that
 * here is how the button and the bet drift apart.
 */
export const BetButton = ({
  label,
  variant = BetButtonVariant.Bet,
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
        const sound = VARIANT_SOUND[variant];
        if (sound) playSound(sound);
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
