import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ConnectionState,
  LaunchStatus,
  SDK_INSTALLED,
  useConnectionStatus,
  useGameConfig,
  useKrashState,
} from "@/sdk";
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
 *
 * Three gates, not one, and the SDK's own guide is explicit about why: `ready`
 * means the REST launch finished and the socket connect *started*. The game is
 * playable when the socket has been through JoinCrashOk — the second
 * `connected` — and `GameConfig` has arrived, because the betting panel has no
 * limits or currency without it.
 */
export const LaunchGate = ({ children }: LaunchGateProps) => {
  const { t } = useTranslation();
  const { launchStatus, launchError, lobbyUrl } = useKrashState();
  const { state } = useConnectionStatus();
  const gameConfig = useGameConfig();

  if (launchStatus === LaunchStatus.Error) {
    return (
      <div className={styles["launch-gate"]} role="alert">
        <p className={styles["launch-gate__title"]}>{t("launch.failed")}</p>
        <p className={styles["launch-gate__text"]}>
          {launchError ?? t("launch.unknownError")}
        </p>
        {lobbyUrl && (
          <a className={styles["launch-gate__link"]} href={lobbyUrl}>
            {t("launch.backToLobby")}
          </a>
        )}
      </div>
    );
  }

  const ready =
    launchStatus === LaunchStatus.Ready &&
    state === ConnectionState.Connected &&
    // No packages, no server, no config — and nothing to wait for. This clause
    // and the flag behind it are deleted together when the SDK is installed.
    (gameConfig !== null || !SDK_INSTALLED);

  if (!ready) {
    return (
      <div className={styles["launch-gate"]} role="status" aria-live="polite">
        <span className={styles["launch-gate__spinner"]} aria-hidden="true" />
        <p className={styles["launch-gate__text"]}>{t("launch.loading")}</p>
      </div>
    );
  }

  return children;
};
