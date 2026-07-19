import { Size } from "@/constants";
import { PlayNowButton, PlayNowBtnVariants } from "@/components/ui/PlayNowButton";
import styles from "./BonusSpinContent.module.css";

export const BonusSpinContent = () => {
  const amount = "10";
  const label = "Free Bet";
  const availableFor = "Bonus bet available for 7 Days";

  return (
    <div className={styles["bonus-spin"]}>
      <div className={styles["bonus-spin__info"]}>
        <span className={styles["bonus-spin__title"]}>You Get</span>
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
