import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import styles from "./ProbablyFairContent.module.css";
import { HIDDEN_STATE_ROWS } from "./ProbablyFairContent.constants";

/**
 * Body of the "Provably Fair" modal.
 *
 * The hidden-state table is built from label/value pairs rather than a header
 * row and a value row: on desktop each pair is a column, on mobile each pair
 * is a row of its own — four columns have nowhere near the width they need on
 * a phone, and fixed ones stretched the whole sheet past the screen.
 */
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
          {HIDDEN_STATE_ROWS.map(({ labelKey, value, valueKey, nowrap }) => (
            <div
              key={labelKey}
              className={cx(
                styles["probably-table__row"],
                nowrap && styles["probably-table__row--nowrap"],
              )}
            >
              <div className={styles["probably-table__head"]}>{t(labelKey)}</div>
              <div className={styles["probably-table__cell"]}>
                {valueKey ? t(valueKey) : value}
              </div>
            </div>
          ))}
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
