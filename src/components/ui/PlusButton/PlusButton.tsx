import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./PlusButton.module.css";
import type { PlusButtonProps } from "./PlusButton.types";

export const PlusButton = ({ className, ...rest }: PlusButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={cx(styles["plus-button"], className)}
      aria-label={t("stepper.increase")}
      {...rest}
    >
      <img
        className={styles["plus-button__icon"]}
        src="/assets/icons/Plus.svg"
        alt=""
        aria-hidden="true"
      />
    </button>
  );
};
