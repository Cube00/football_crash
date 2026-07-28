import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./MinusButton.module.css";
import type { MinusButtonProps } from "./MinusButton.types";

export const MinusButton = ({ className, ...rest }: MinusButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={cx(styles["minus-button"], className)}
      aria-label={t("stepper.decrease")}
      {...rest}
    >
      <img
        className={styles["minus-button__icon"]}
        src="/assets/icons/Minus.svg"
        alt=""
        aria-hidden="true"
      />
    </button>
  );
};
