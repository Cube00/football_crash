import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./RoundsButton.module.css";
import type { RoundsButtonTypes } from "./RoundsButton.types";
import { RoundsButtonVariants } from "./RoundsButton.constants";

export const RoundsButton = ({
  variant,
  size,
  className,
  ...rest
}: RoundsButtonTypes) => {
  const { t } = useTranslation();
  const classes = cx(
    styles["roundsButton-button"],
    styles[`roundsButton-button--${variant}`],
    styles[`roundsButton-button--${size}`],
    className,
  );

  return (
    <button className={classes} {...rest}>
      {RoundsButtonVariants.Stop === variant ? (
        <>
          <span className={styles["roundsButton-button__value"]}>
            1<span>/ 10</span>
          </span>
          <span className={styles["roundsButton-button__label"]}>
            {t("common.stop")}
          </span>
        </>
      ) : (
        <>
          <span className={styles["roundsButton-button__value"]}>10</span>
          <span className={styles["roundsButton-button__label"]}>
            {t("common.rounds")}
          </span>
        </>
      )}
    </button>
  );
};
