import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import styles from "./Toggle.module.css";
import type { ToggleProps } from "./Toggle.types";

export const Toggle = ({ className, onChange, ...rest }: ToggleProps) => {
  return (
    <label className={cx(styles["toggle"], className)}>
      <input
        type="checkbox"
        className={styles["toggle__input"]}
        // Only a real flip makes noise; setting `checked` from code does not
        // fire change, so nothing clicks when the round drives a toggle.
        onChange={(event) => {
          playSound(Sound.SmallButton);
          onChange?.(event);
        }}
        {...rest}
      />
      <span className={styles["toggle__track"]}>
        <span className={styles["toggle__knob"]} />
      </span>
    </label>
  );
};
