import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import { Icon } from "../Icon";
import styles from "./MenuButton.module.css";
import type { MenuButtonProps } from "./MenuButton.types";

export const MenuButton = ({
  open = false,
  className,
  onClick,
  ...rest
}: MenuButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={cx(
        styles["menu-button"],
        open && styles["menu-button--open"],
        className,
      )}
      aria-label={open ? t("header.closeMenu") : t("header.menu")}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(event) => {
        playSound(Sound.SmallButton);
        onClick?.(event);
      }}
      {...rest}
    >
      <Icon
        className={styles["menu-button__icon"]}
        src={open ? "/assets/icons/Close.svg" : "/assets/icons/Menu.svg"}
      />
    </button>
  );
};
