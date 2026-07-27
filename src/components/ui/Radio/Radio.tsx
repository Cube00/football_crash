import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import styles from "./Radio.module.css";
import type { RadioProps } from "./Radio.types";

/**
 * Single choice in a radio group. The label wraps `children`, so a whole row —
 * not just the 20px circle — selects the option.
 *
 * Size and the gap to `children` are set by `--radio-size` / `--radio-gap`,
 * which lets a caller restyle the layout without out-specificity-ing this file.
 */
export const Radio = ({
  className,
  onChange,
  children,
  ...rest
}: RadioProps) => {
  return (
    <label className={cx(styles["radio"], className)}>
      <input
        type="radio"
        className={styles["radio__input"]}
        onChange={(event) => {
          playSound(Sound.SmallButton);
          onChange?.(event);
        }}
        {...rest}
      />
      <span className={styles["radio__mark"]} />
      {children}
    </label>
  );
};
