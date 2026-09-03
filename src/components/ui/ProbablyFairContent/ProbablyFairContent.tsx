import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { cx } from "@/utils";
import { useCrashHistory, useLiveFairness } from "@/hooks";

import styles from "./ProbablyFairContent.module.css";
import {
  FAIRNESS_PARAMETERS,
  HIDDEN_FACTS,
  REVEALED_FACTS,
} from "./ProbablyFairContent.constants";
import type { FairnessFact } from "./ProbablyFairContent.constants";

interface StateRow {
  labelKey: TranslationKey;
  value?: string;
  valueKey?: TranslationKey;
  nowrap?: boolean;
}

/** Stands in for a value the round has not published yet. */
const PENDING = "—";

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
  const live = useLiveFairness();
  // The most recent finished round is the one whose seed has been revealed —
  // and it has to be the merged history, or the round that just crashed is
  // missing from it until the server is asked again.
  const { rounds } = useCrashHistory();
  const revealed = rounds[0];

  /**
   * Before the round runs, the server has committed to a crash point but not
   * published it: the hash is the commit, the seed and the crash point stay
   * hidden. Both tables show the same four fields so a player can hold them
   * side by side and see exactly what the round handed back.
   */
  const hiddenRows: readonly StateRow[] = [
    {
      labelKey: "provablyFair.roundNumber",
      value: live.roundId || PENDING,
      nowrap: true,
    },
    { labelKey: "provablyFair.serverKey", valueKey: "provablyFair.hidden" },
    { labelKey: "provablyFair.crashPoint", valueKey: "provablyFair.hidden" },
    {
      labelKey: "provablyFair.provablyFairHash",
      value: live.fairnessHash ?? PENDING,
    },
  ];

  const revealedRows: readonly StateRow[] = [
    {
      labelKey: "provablyFair.roundNumber",
      value: revealed?.roundId ?? PENDING,
      nowrap: true,
    },
    {
      labelKey: "provablyFair.serverKey",
      value: revealed?.serverSeed ?? PENDING,
    },
    {
      labelKey: "provablyFair.crashPoint",
      value: revealed ? `${revealed.crashAt.toFixed(2)}x` : PENDING,
    },
    {
      labelKey: "provablyFair.provablyFairHash",
      value: revealed?.fairnessHash ?? PENDING,
    },
  ];

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
        <StateTable rows={hiddenRows} />
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
        <StateTable rows={revealedRows} />
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
