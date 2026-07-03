import { cx } from "@/utils";
import { Size } from "@/constants";
import styles from "./MultiplierButton.module.css";
import { MultiplierButtonVariant } from "./MultiplierButton.constants";
import type { MultiplierButtonProps } from "./MultiplierButton.types";

export const MultiplierButton = ({
  label,
  variant = MultiplierButtonVariant.White,
  size = Size.Web,
  className,
  ...rest
}: MultiplierButtonProps) => {
  const classes = cx(
    styles["multiplier-button"],
    styles[`multiplier-button--${variant}`],
    styles[`multiplier-button--${size}`],
    className,
  );

  return (
    <button className={classes} {...rest}>
      <span className={styles["multiplier-button__label"]}>{label}</span>
    </button>
  );
};
