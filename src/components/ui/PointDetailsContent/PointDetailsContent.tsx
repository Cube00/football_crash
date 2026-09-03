import { useTranslation } from "react-i18next";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatDateTime } from "@/utils";
import { useCopyToClipboard } from "@/hooks";
import styles from "./PointDetailsContent.module.css";
import type { PointDetailsContentProps } from "./PointDetailsContent.types";

export const PointDetailsContent = ({ point }: PointDetailsContentProps) => {
  const { t, i18n } = useTranslation();
  const { copied, copy } = useCopyToClipboard();

  // Every field is the round's own. A pill is only ever built from a finished
  // round, so the seed has been revealed by the time this can be opened.
  //
  // `crashAt` is the multiplier, not a time — the round's clock is
  // `startTimeMs`, when it began. Confusing the two is on the SDK's own list of
  // common mistakes.
  const roundId = point?.roundId ?? "";
  const multiplier = point ? `${point.crashAt.toFixed(2)}x` : "";
  const date = formatDateTime(point?.startTimeMs, i18n.language);
  const hash = point?.fairnessHash ?? "";
  const serverSeed = point?.serverSeed ?? "";

  return (
    <div className={styles["point-details"]}>
      <div className={styles["point-details__row"]}>
        <span className={styles["point-details__label"]}>
          {t("pointDetails.roundId")}
        </span>
        <span className={styles["point-details__value"]}>{roundId}</span>
      </div>

      <div className={styles["point-details__card"]}>
        <div className={styles["point-details__card-top"]}>
          <span className={styles["point-details__badge"]}>
            <img src="/assets/icons/Rocket.svg" alt={t("a11y.rocket")} />
          </span>
          <span className={styles["point-details__multiplier"]}>
            {multiplier}
          </span>
        </div>
        <div className={styles["point-details__card-bottom"]}>
          <span className={styles["point-details__date"]}>{date}</span>
          <span className={styles["point-details__hash"]}>
            <img src="/assets/icons/Check.svg" alt={t("a11y.check")} />
            <span className={styles["point-details__hash-text"]}>{hash}</span>
            <CopyButton
              value={hash}
              copied={copied === "hash"}
              onCopy={(value) => void copy("hash", value)}
            />
          </span>
        </div>
      </div>

      <div className={styles["point-details__row"]}>
        <span className={styles["point-details__label"]}>
          {t("pointDetails.serverSeed")}
        </span>
        <span className={styles["point-details__value"]}>
          <span className={styles["point-details__seed-text"]}>
            {serverSeed}
          </span>
          <CopyButton
            value={serverSeed}
            copied={copied === "seed"}
            onCopy={(value) => void copy("seed", value)}
          />
        </span>
      </div>

      <button type="button" className={styles["point-details__link"]}>
        {t("pointDetails.meaningOfProvablyFair")}
      </button>
    </div>
  );
};
