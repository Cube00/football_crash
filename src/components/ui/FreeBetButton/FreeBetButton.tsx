import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import { Icon } from "../Icon";
import styles from "./FreeBetButton.module.css";
import type { FreeBetButtonProps } from "./FreeBetButton.types";

export const FreeBetButton = ({
  count,
  className,
  onClick,
  ...rest
}: FreeBetButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={cx(styles["freebet-button"], className)}
      onClick={(event) => {
        playSound(Sound.SmallButton);
        onClick?.(event);
      }}
      {...rest}
    >
      <span className={styles["freebet-button__pill"]}>
        <Icon src="/assets/icons/gift.svg" size={20} />
        <span className={styles["freebet-button__label"]}>
          {t("common.freeBet")}
        </span>
        <span className={styles["freebet-button__count"]}>{count}</span>
      </span>
    </button>
  );
};
