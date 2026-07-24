import { cx } from "@/utils";
import { Size } from "@/constants";
import { playSound, Sound } from "@/game/sounds";
import styles from "./AmountButton.module.css";
import type { AmountButtonProps } from "./AmountButton.types";

export const AmountButton = ({
  label,
  size = Size.Web,
  active = false,
  className,
  onClick,
  ...rest
}: AmountButtonProps) => {
  const classes = cx(
    styles["amount-button"],
    styles[`amount-button--${size}`],
    active && styles["amount-button--active"],
    className,
  );

  return (
    <button
      className={classes}
      onClick={(event) => {
        playSound(Sound.SmallButton);
        onClick?.(event);
      }}
      {...rest}
    >
      <span className={styles["amount-button__label"]}>{label}</span>
    </button>
  );
};
