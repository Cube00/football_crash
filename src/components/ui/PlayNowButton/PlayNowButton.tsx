import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import styles from "./PlayNowButton.module.css";
import type { PlayNowButtonProps } from "./PlayNowButton.types";

export const PlayNowButton = ({
  variant,
  size,
  className,
  onClick,
  ...rest
}: PlayNowButtonProps) => {
  const { t } = useTranslation();
  const classes = cx(
    styles["playnow-button"],
    styles[`playnow-button--${variant}`],
    styles[`playnow-button--${size}`],
    className,
  );

  return (
    <button
      type="button"
      className={classes}
      onClick={(event) => {
        playSound(Sound.SmallButton);
        onClick?.(event);
      }}
      {...rest}
    >
      <span>{t("common.playNow")}</span>
    </button>
  );
};
