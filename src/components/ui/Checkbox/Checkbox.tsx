import { cx } from "@/utils";
import styles from "./Checkbox.module.css";
import type { CheckboxProps } from "./Checkbox.types";

export const Checkbox = ({ className, ...rest }: CheckboxProps) => {
  return (
    <label className={cx(styles["checkbox"], className)}>
      <input type="checkbox" className={styles["checkbox__input"]} {...rest} />
      <span className={styles["checkbox__box"]}>
        <svg
          className={styles["checkbox__icon"]}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2 6.5L4.5 9L10 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
};
