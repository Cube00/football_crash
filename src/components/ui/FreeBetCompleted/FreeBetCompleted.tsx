import { useTranslation } from "react-i18next";
import { Modal, ModalWidth } from "@/components/ui/Modal";
import { FreeroundEndReason, useFreerounds } from "@/sdk";
import { useMoney } from "@/hooks";
import styles from "./FreeBetCompleted.module.css";

/** Why the grant ended decides the heading — finished, ran out of time, pulled. */
const TITLE_KEYS = {
  [FreeroundEndReason.Completed]: "freeBets.completedTitle",
  [FreeroundEndReason.Expired]: "freeBets.expiredTitle",
  [FreeroundEndReason.Cancelled]: "freeBets.cancelledTitle",
} as const;

/**
 * The free bet close-out.
 *
 * Driven by `lastCompleted`, which the SDK sets **only** from the server's
 * `freeround-summary` push — never from the earlier `freeround-completed` hint.
 * That ordering is the whole reason this component exists as its own thing: the
 * hint arrives first and carries no `totalWin`, so a modal opened on it would
 * show the player a zero and then have to correct itself.
 *
 * Closing must acknowledge, or the next grant's summary has nowhere to land.
 */
export const FreeBetCompleted = () => {
  const { t } = useTranslation();
  const { lastCompleted, acknowledgeCompleted } = useFreerounds();
  const { currency, format } = useMoney();

  if (!lastCompleted) return null;

  // Older server builds omit the reason; a finished grant is the common case.
  const reason = lastCompleted.reason ?? FreeroundEndReason.Completed;

  return (
    <Modal
      isOpen
      title={t(TITLE_KEYS[reason])}
      width={ModalWidth.Sm}
      mobileSheet
      onClose={acknowledgeCompleted}
    >
      <div className={styles["free-bet-completed"]}>
        <p className={styles["free-bet-completed__win"]}>
          {format(lastCompleted.totalWin)}
          <span className={styles["free-bet-completed__currency"]}>
            {currency}
          </span>
        </p>
        <span className={styles["free-bet-completed__label"]}>
          {t("freeBets.totalWin")}
        </span>

        <dl className={styles["free-bet-completed__facts"]}>
          <div className={styles["free-bet-completed__fact"]}>
            <dt>{t("freeBets.roundsPlayed")}</dt>
            <dd>{lastCompleted.roundsPlayed}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
};
