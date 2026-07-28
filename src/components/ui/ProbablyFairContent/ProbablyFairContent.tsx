import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./ProbablyFairContent.module.css";

export const ProbablyFairContent = () => {
  const { t } = useTranslation();

  return (
    <div className={styles["probably"]}>
      <div className={styles["probably-howworks"]}>
        <h2>{t("provablyFair.howItWorks")}</h2>
        <span>{t("provablyFair.howItWorksBody")}</span>
      </div>
      <div className={styles["probably-beforestarts"]}>
        <h2 className={styles["probably-beforestarts__label"]}>
          {t("provablyFair.beforeRoundStarts")}
        </h2>
        <div className={styles["probably-table"]}>
          <div className={styles["probably-table__row"]}>
            <div
              className={cx(
                styles["probably-table__head"],
                styles["probably-table__col--num"],
              )}
            >
              {t("provablyFair.roundNumber")}
            </div>
            <div className={styles["probably-table__head"]}>
              {t("provablyFair.serverKey")}
            </div>
            <div className={styles["probably-table__head"]}>
              {t("provablyFair.crashPoint")}
            </div>
            <div className={styles["probably-table__head"]}>
              {t("provablyFair.provablyFairHash")}
            </div>
          </div>
          <div className={styles["probably-table__row__cels"]}>
            <div
              className={cx(
                styles["probably-table__cell"],
                styles["probably-table__col--num"],
              )}
            >
              1
            </div>
            <div className={styles["probably-table__cell"]}>
              {t("provablyFair.hidden")}
            </div>
            <div className={styles["probably-table__cell"]}>
              {t("provablyFair.hidden")}
            </div>
            <div className={styles["probably-table__cell"]}>
              8f3a2b9c7d1e...
            </div>
          </div>
        </div>
      </div>
      <div className={styles["probably-begins"]}>
        <h3 className={styles["probably-begins__title"]}>
          {t("provablyFair.beforeGameBegins")}
        </h3>
        <ul className={styles["probably-begins__list"]}>
          <li className={styles["probably-begins__item"]}>
            <span className={styles["probably-begins__term"]}>
              {t("provablyFair.roundNumber")}
            </span>{" "}
            {t("provablyFair.roundNumberDescription")}
          </li>
          <li className={styles["probably-begins__item"]}>
            <span className={styles["probably-begins__term"]}>
              {t("provablyFair.provablyFairHash")}
            </span>{" "}
            {t("provablyFair.provablyFairHashDescription")}
          </li>
        </ul>
        <p className={styles["probably-begins__note"]}>
          {t("provablyFair.note")}
        </p>
      </div>
    </div>
  );
};
