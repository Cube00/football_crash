import { useTranslation } from "react-i18next";
import { useFreerounds, useGameConfig } from "@/sdk";
import { useMoney } from "@/hooks";
import styles from "./LimitsContent.module.css";

/**
 * Body of the "Limits" modal.
 *
 * Every figure here is the operator's, not ours: the win ceiling is
 * `GameConfig.maxWinAmount` — an amount in the player's currency, not a
 * multiplier — and the free-bet floor comes from whichever grant is bound.
 * There is no minimum-cashout field in the game config at all; that number
 * exists only on a grant, which is why the copy stays general without one.
 *
 * The copy used to state 25,000x and 1.50x outright — numbers that were only
 * ever true of the local engine. Where a value has not arrived yet the wording
 * drops the number rather than inventing one.
 */
export const LimitsContent = () => {
  const { t } = useTranslation();
  const config = useGameConfig();
  const { currency, format } = useMoney();
  const { state: freeround } = useFreerounds();

  const maxWin = config?.maxWinAmount;
  const minCashout = freeround?.minCashout;

  return (
    <div className={styles["limits"]}>
      <div className={styles["limits-block"]}>
        <h2>{t("limits.maximumWin.title")}</h2>
        <span>
          {maxWin != null
            ? t("limits.maximumWin.body", {
                amount: format(maxWin),
                currency,
              })
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
