import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { FreeBetLabel } from "@/components/ui/FreeBetsContent";
import styles from "./ArchiveContent.module.css";
import { ARCHIVED_FREE_BETS } from "./ArchiveContent.constants";

/**
 * Body of the "Archive" modal: free bets that are already played out, read-only,
 * each with what it returned.
 */
export const ArchiveContent = () => {
  const { t } = useTranslation();

  return (
    <ul className={styles["archive"]}>
      {ARCHIVED_FREE_BETS.map((bet) => (
        <li key={bet.id} className={styles["archive__item"]}>
          <span className={styles["archive__fields"]}>
            <Field labelKey={FreeBetLabel.Type} value={t(bet.typeKey)} />
            <Field labelKey={FreeBetLabel.BetAmount} value={bet.betAmount} />
            {bet.betPrice && (
              <Field labelKey={FreeBetLabel.BetPrice} value={bet.betPrice} />
            )}
          </span>

          <span className={styles["archive__payout"]}>{bet.payout}</span>
        </li>
      ))}
    </ul>
  );
};

const Field = ({
  labelKey,
  value,
}: {
  labelKey: TranslationKey;
  value: string;
}) => {
  const { t } = useTranslation();

  return (
    <span className={styles["archive__field"]}>
      <span className={styles["archive__label"]}>{t(labelKey)}</span>
      <span className={styles["archive__value"]}>{value}</span>
    </span>
  );
};
