import { FreeBetLabel } from "@/components/ui/FreeBetsContent";
import styles from "./ArchiveContent.module.css";
import { ARCHIVED_FREE_BETS } from "./ArchiveContent.constants";

/**
 * Body of the "Archive" modal: free bets that are already played out, read-only,
 * each with what it returned.
 */
export const ArchiveContent = () => {
  return (
    <ul className={styles["archive"]}>
      {ARCHIVED_FREE_BETS.map((bet) => (
        <li key={bet.id} className={styles["archive__item"]}>
          <span className={styles["archive__fields"]}>
            <Field label={FreeBetLabel.Type} value={bet.type} />
            <Field label={FreeBetLabel.BetAmount} value={bet.betAmount} />
            {bet.betPrice && (
              <Field label={FreeBetLabel.BetPrice} value={bet.betPrice} />
            )}
          </span>

          <span className={styles["archive__payout"]}>{bet.payout}</span>
        </li>
      ))}
    </ul>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <span className={styles["archive__field"]}>
    <span className={styles["archive__label"]}>{label}</span>
    <span className={styles["archive__value"]}>{value}</span>
  </span>
);
