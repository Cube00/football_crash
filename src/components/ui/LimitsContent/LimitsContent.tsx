import { useTranslation } from "react-i18next";
import styles from "./LimitsContent.module.css";

export const LimitsContent = () => {
  const { t } = useTranslation();

  return (
    <div className={styles["limits"]}>
      <div className={styles["limits-block"]}>
        <h2>{t("limits.maximumWin.title")}</h2>
        <span>{t("limits.maximumWin.body")}</span>
      </div>
      <div className={styles["limits-block"]}>
        <h2>{t("limits.minimumCashOut.title")}</h2>
        <span>{t("limits.minimumCashOut.body")}</span>
      </div>
    </div>
  );
};
