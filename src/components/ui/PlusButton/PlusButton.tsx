import { cx } from "@/utils";
import styles from "./PlusButton.module.css";
import type { PlusButtonProps } from "./PlusButton.types";

export const PlusButton = ({ className, ...rest }: PlusButtonProps) => {
  return (
    <button
      type="button"
      className={cx(styles["plus-button"], className)}
      aria-label="Increase"
      {...rest}
    >
      <img
        className={styles["plus-button__icon"]}
        src="/assets/Plus.svg"
        alt=""
        aria-hidden="true"
      />
    </button>
  );
};
