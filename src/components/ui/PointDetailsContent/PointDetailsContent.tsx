import { useTranslation } from "react-i18next";
import styles from "./PointDetailsContent.module.css";
import type { PointDetailsContentProps } from "./PointDetailsContent.types";

export const PointDetailsContent = ({ point }: PointDetailsContentProps) => {
  const { t } = useTranslation();
  const roundId = point?.roundId ?? "1153219";
  const multiplier = `${(point?.multiplier ?? 24.53).toFixed(2)}x`;
  // Not on the round yet — placeholders until the rounds API lands.
  const date = "01 Feb, 2025  4:00";
  const hash = "5435a2567s424k12310afed4";
  const serverSeed = "5435a2567s424k12310afed4459sa21467s";

  return (
    <div className={styles["point-details"]}>
      <div className={styles["point-details__row"]}>
        <span className={styles["point-details__label"]}>
          {t("pointDetails.roundId")}
        </span>
        <span className={styles["point-details__value"]}>{roundId}</span>
      </div>

      <div className={styles["point-details__card"]}>
        <div className={styles["point-details__card-top"]}>
          <span className={styles["point-details__badge"]}>
            <img src="/assets/icons/Rocket.svg" alt={t("a11y.rocket")} />
          </span>
          <span className={styles["point-details__multiplier"]}>
            {multiplier}
          </span>
        </div>
        <div className={styles["point-details__card-bottom"]}>
          <span className={styles["point-details__date"]}>{date}</span>
          <span className={styles["point-details__hash"]}>
            <img src="/assets/icons/Check.svg" alt={t("a11y.check")} />
            <span className={styles["point-details__hash-text"]}>{hash}</span>
            <img src="/assets/icons/Copy.svg" alt={t("a11y.copy")} />
          </span>
        </div>
      </div>

      <div className={styles["point-details__row"]}>
        <span className={styles["point-details__label"]}>
          {t("pointDetails.serverSeed")}
        </span>
        <span className={styles["point-details__value"]}>
          <span className={styles["point-details__seed-text"]}>
            {serverSeed}
          </span>
          <img src="/assets/icons/Copy.svg" alt={t("a11y.copy")} />
        </span>
      </div>

      <button type="button" className={styles["point-details__link"]}>
        {t("pointDetails.meaningOfProvablyFair")}
      </button>
    </div>
  );
};
