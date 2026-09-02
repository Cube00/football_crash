import { useTranslation } from "react-i18next";
import { useFreerounds, useGameConfig } from "@/sdk";
import styles from "./LimitsContent.module.css";

/**
 * Body of the "Limits" modal.
 *
 * Every figure here is the operator's, not ours: the win ceiling comes from the
 * game config and the free-bet floor from whichever grant is bound. The copy
 * used to state 25,000x and 1.50x outright — numbers that were only ever true
 * of the local engine, and which the second sentence then admitted were
 * "configurable". Where the value has not arrived yet the wording drops the
 * number rather than inventing one.
 */
export const LimitsContent = () => {
  const { t } = useTranslation();
  const config = useGameConfig();
  const { state: freeround } = useFreerounds();

  // TODO(sdk): `GameConfig`'s shape is not documented — confirm the field that
  // carries the maximum win multiplier and read it here.
  const maxWin: number | undefined = undefined;
  const minCashout = freeround?.minCashout;

  return (
    <div className={styles["limits"]}>
      <div className={styles["limits-block"]}>
        <h2>{t("limits.maximumWin.title")}</h2>
        <span>
          {maxWin != null
            ? t("limits.maximumWin.body", { multiplier: maxWin })
            : t("limits.maximumWin.bodyUnknown")}
        </span>
      </div>
      <div className={styles["limits-block"]}>
        <h2>{t("limits.minimumCashOut.title")}</h2>
        <span>
          {minCashout != null
            ? t("limits.minimumCashOut.body", { multiplier: minCashout })
            : t("limits.minimumCashOut.bodyUnknown")}
        </span>
      </div>
      {config == null && (
        <p className={styles["limits-block__pending"]}>
          {t("limits.pending")}
        </p>
      )}
    </div>
  );
};
