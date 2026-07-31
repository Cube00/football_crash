import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import { Icon } from "../Icon";
import styles from "./WinNotification.module.css";
import type { WinNotificationProps } from "./WinNotification.types";

/**
 * The cashout banner: what the player just won, for as long as the caller
 * keeps it mounted. It fades itself out over `durationMs` so the last frame
 * before the unmount is not a hard cut.
 */
export const WinNotification = ({
  amount,
  currency,
  durationMs = 4000,
  onClose,
  className,
  style,
  ...rest
}: WinNotificationProps) => {
  const { t } = useTranslation();

  const vars = {
    "--win-notification-duration": `${durationMs}ms`,
  } as CSSProperties;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(styles["win-notification"], className)}
      style={{ ...vars, ...style }}
      {...rest}
    >
      <Icon src="/assets/icons/Success.svg" />

      <span className={styles["win-notification__label"]}>
        {t("common.youWin")}
      </span>

      <span className={styles["win-notification__amount"]}>
        {amount.toFixed(2)} {currency}
      </span>

      <button
        type="button"
        className={styles["win-notification__close"]}
        aria-label={t("common.close")}
        onClick={() => {
          playSound(Sound.SmallButton);
          onClose?.();
        }}
      >
        <Icon src="/assets/icons/Close.svg" />
      </button>
    </div>
  );
};
