import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import { Icon } from "../Icon";
import { Toggle } from "../Toggle";
import styles from "./Menu.module.css";
import { MenuItemKind } from "./Menu.types";
import type { MenuItem, MenuProps } from "./Menu.types";

/** The icon a toggle row shows for its current state. */
const iconFor = (item: MenuItem, on: boolean) =>
  item.kind === MenuItemKind.Toggle && !on && item.iconOff ? item.iconOff : item.icon;

export const Menu = ({
  items,
  toggles,
  onToggle,
  onSelect,
  className,
  ...rest
}: MenuProps) => {
  const { t } = useTranslation();

  return (
    <div className={cx(styles["menu"], className)} role="menu" {...rest}>
      {items.map((item) => {
        const label = t(item.labelKey);

        if (item.kind === MenuItemKind.Toggle) {
          const on = Boolean(toggles[item.id]);
          return (
            // Not a <label>: Toggle is one already, and nesting them is invalid.
            <div
              key={item.id}
              className={cx(styles["menu__item"], on && styles["menu__item--on"])}
            >
              <Icon src={iconFor(item, on)} />
              <span className={styles["menu__label"]}>{label}</span>
              <Toggle
                className={styles["menu__toggle"]}
                checked={on}
                aria-label={label}
                onChange={(event) => onToggle(item.id, event.target.checked)}
              />
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={cx(styles["menu__item"], styles["menu__item--action"])}
            onClick={() => {
              playSound(Sound.SmallButton);
              onSelect(item.id);
            }}
          >
            <Icon src={item.icon} />
            <span className={styles["menu__label"]}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
