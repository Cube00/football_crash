import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { cx } from "@/utils";
import styles from "./ProbablyFairContent.module.css";
import {
  FAIRNESS_PARAMETERS,
  HIDDEN_FACTS,
  HIDDEN_STATE_ROWS,
  REVEALED_FACTS,
  REVEALED_STATE_ROWS,
} from "./ProbablyFairContent.constants";
import type { FairnessFact } from "./ProbablyFairContent.constants";

interface StateRow {
  labelKey: TranslationKey;
  value?: string;
  valueKey?: TranslationKey;
  nowrap?: boolean;
}

/**
 * One of the round's two states.
 *
 * Built from label/value pairs rather than a header row and a value row: on
 * desktop each pair is a column, on mobile each pair is a row of its own — four
 * columns have nowhere near the width they need on a phone, and fixed ones
 * stretched the whole sheet past the screen.
 */
const StateTable = ({ rows }: { rows: readonly StateRow[] }) => {
  const { t } = useTranslation();

  return (
    <div className={styles["probably-table"]}>
      {rows.map(({ labelKey, value, valueKey, nowrap }) => (
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
  );
};

/** A term and its meaning. Bulleted by default; numbered where order matters. */
const FactList = ({
  facts,
  ordered = false,
}: {
  facts: readonly FairnessFact[];
  ordered?: boolean;
}) => {
  const { t } = useTranslation();
  const List = ordered ? "ol" : "ul";

  return (
    <List
      className={cx(
        styles["probably-begins__list"],
        ordered && styles["probably-begins__list--ordered"],
      )}
    >
      {facts.map(({ termKey, descriptionKey }) => (
        <li key={descriptionKey} className={styles["probably-begins__item"]}>
          <span className={styles["probably-begins__term"]}>{t(termKey)}</span>{" "}
          {t(descriptionKey)}
        </li>
      ))}
    </List>
  );
};

/**
 * Body of the "Provably Fair" modal: what the game commits to before a round,
 * what it reveals afterwards, and the formula tying the two together.
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
        <StateTable rows={HIDDEN_STATE_ROWS} />
      </div>

      <div className={styles["probably-begins"]}>
        <h3 className={styles["probably-begins__title"]}>
          {t("provablyFair.beforeGameBegins")}
        </h3>
        <FactList facts={HIDDEN_FACTS} />
        <p className={styles["probably-begins__note"]}>
          {t("provablyFair.note")}
        </p>
      </div>

      <div className={styles["probably-beforestarts"]}>
        <h2 className={styles["probably-beforestarts__label"]}>
          {t("provablyFair.afterRoundEnds")}
        </h2>
        <StateTable rows={REVEALED_STATE_ROWS} />
      </div>

      <div className={styles["probably-begins"]}>
        <h3 className={styles["probably-begins__title"]}>
          {t("provablyFair.onceRoundCompletes")}
        </h3>
        <FactList facts={REVEALED_FACTS} />
      </div>

      <div className={styles["probably-begins"]}>
        <h2 className={styles["probably-beforestarts__label"]}>
          {t("provablyFair.fourParameters")}
        </h2>
        <p className={styles["probably-begins__note"]}>
          {t("provablyFair.fourParametersIntro")}
        </p>
        <FactList facts={FAIRNESS_PARAMETERS} ordered />
      </div>

      <div className={styles["probably-begins"]}>
        <h2 className={styles["probably-beforestarts__label"]}>
          {t("provablyFair.verificationFormula")}
        </h2>
        <p className={styles["probably-formula"]}>{t("provablyFair.formula")}</p>
      </div>

      <div className={styles["probably-begins"]}>
        <h2 className={styles["probably-beforestarts__label"]}>
          {t("provablyFair.exampleTitle")}
        </h2>
        <p className={styles["probably-example"]}>
          {t("provablyFair.exampleBody")}
        </p>
      </div>
    </div>
  );
};
