import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LaunchStatus, useKrashState } from "@/sdk";
import styles from "./LaunchGate.module.css";

interface LaunchGateProps {
  children: ReactNode;
}

/**
 * Holds the whole skin back until the SDK session is live.
 *
 * This is not politeness — it is what keeps the canvas correct. Phaser measures
 * its container on mount and the Spine scene starts in an idle stance it only
 * leaves on a phase event; booting it before the session has joined a room
 * means a canvas sized against a loading screen and a boy standing still
 * through a round nobody told him about.
 */
export const LaunchGate = ({ children }: LaunchGateProps) => {
  const { t } = useTranslation();
  const { launchStatus, launchError } = useKrashState();

  if (launchStatus === LaunchStatus.Loading) {
    return (
      <div className={styles["launch-gate"]} role="status" aria-live="polite">
        <span className={styles["launch-gate__spinner"]} aria-hidden="true" />
        <p className={styles["launch-gate__text"]}>{t("launch.loading")}</p>
      </div>
    );
  }

  if (launchStatus === LaunchStatus.Error) {
    return (
      <div className={styles["launch-gate"]} role="alert">
        <p className={styles["launch-gate__title"]}>{t("launch.failed")}</p>
        <p className={styles["launch-gate__text"]}>
          {launchError ?? t("launch.unknownError")}
        </p>
      </div>
    );
  }

  return children;
};
