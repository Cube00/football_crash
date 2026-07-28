import { useTranslation } from "react-i18next";
import { Size } from "@/constants";
import { PlayNowButton, PlayNowBtnVariants } from "@/components/ui/PlayNowButton";
import styles from "./BonusSpinContent.module.css";

export const BonusSpinContent = () => {
  const { t } = useTranslation();
  const amount = "10";
  const label = t("bonus.freeBet");
  const availableFor = t("bonus.availableForDays", { count: 7 });

  return (
    <div className={styles["bonus-spin"]}>
      <div className={styles["bonus-spin__info"]}>
        <span className={styles["bonus-spin__title"]}>{t("bonus.youGet")}</span>
        <p className={styles["bonus-spin__amount"]}>{amount}</p>
        <span className={styles["bonus-spin__label"]}>{label}</span>
        <span className={styles["bonus-spin__note"]}>{availableFor}</span>
      </div>

      <PlayNowButton
        className={styles["bonus-spin__action"]}
        variant={PlayNowBtnVariants.Orange}
        size={Size.Web}
      />
    </div>
  );
};
