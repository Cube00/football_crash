import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { formatDateTime } from "@/utils";
import { FreeBetLabel, KIND_LABEL_KEYS } from "@/components/ui/FreeBetsContent";
import { useFreerounds } from "@/sdk";
import styles from "./ArchiveContent.module.css";

/** First page of history. The server does not return everything at once. */
const PAGE = 1;
const PAGE_SIZE = 20;

/**
 * Body of the "Archive" modal: free bets that are already played out,
 * read-only, each with what it returned.
 *
 * The rows are the server's — `totalWin` here is the authoritative figure from
 * the same close-out that drives the completion modal, not a tally the skin
 * kept while the grant was running.
 *
 * TODO(sdk): only the first page is fetched. Add paging once the design says
 * how — `loadHistory(page, pageSize)` is ready for it.
 */
export const ArchiveContent = () => {
  const { t, i18n } = useTranslation();
  const { history, loadHistory } = useFreerounds();

  useEffect(() => {
    loadHistory(PAGE, PAGE_SIZE);
  }, [loadHistory]);

  if (history.length === 0) {
    return <p className={styles["archive__empty"]}>{t("freeBets.noneArchived")}</p>;
  }

  return (
    <ul className={styles["archive"]}>
      {history.map((entry) => (
        <li key={entry.grantId} className={styles["archive__item"]}>
          <span className={styles["archive__fields"]}>
            <Field
              labelKey={FreeBetLabel.Type}
              value={t(KIND_LABEL_KEYS[entry.kind])}
            />
            <Field
              labelKey="freeBets.roundsPlayed"
              value={String(entry.roundsPlayed)}
            />
            <Field
              labelKey={FreeBetLabel.Completed}
              value={formatDateTime(entry.completedAt, i18n.language)}
            />
          </span>

          <span className={styles["archive__payout"]}>{entry.totalWin}</span>
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
