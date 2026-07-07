import { cx } from "@/utils";
import styles from "./Toggle.module.css";
import type { ToggleProps } from "./Toggle.types";

export const Toggle = ({ className, ...rest }: ToggleProps) => {
  return (
    <label className={cx(styles["toggle"], className)}>
      <input type="checkbox" className={styles["toggle__input"]} {...rest} />
      <span className={styles["toggle__track"]}>
        <span className={styles["toggle__knob"]} />
      </span>
    </label>
  );
};
