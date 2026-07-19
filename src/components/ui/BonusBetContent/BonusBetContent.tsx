import { Size } from "@/constants";
import { PlayNowButton, PlayNowBtnVariants } from "@/components/ui/PlayNowButton";
import styles from "./BonusBetContent.module.css";

export const BonusBetContent = () => {
  const amount = "10";
  const currency = "USD";
  const availableFor = "Bonus bet available for 7 Days";

  return (
    <div className={styles["bonus-bet"]}>
      <div className={styles["bonus-bet__info"]}>
        <span className={styles["bonus-bet__title"]}>You Get</span>
        <p className={styles["bonus-bet__amount"]}>
          {amount}
          <span className={styles["bonus-bet__currency"]}>{currency}</span>
        </p>
        <span className={styles["bonus-bet__note"]}>{availableFor}</span>
      </div>

      <PlayNowButton
        className={styles["bonus-bet__action"]}
        variant={PlayNowBtnVariants.Orange}
        size={Size.Web}
      />
    </div>
  );
};
