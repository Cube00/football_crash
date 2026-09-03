import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/layout";
import { Balance } from "@/components/ui/Balance";
import { MenuButton } from "@/components/ui/MenuButton";
import { Menu, MENU_ITEMS, MenuItemId } from "@/components/ui/Menu";
import { useMoney, useOnEscape } from "@/hooks";
import { useBalance, useClickOutside, useSettings } from "@/sdk";
import type { GameSettings } from "@/sdk";
import { useModal, ModalId } from "@/context/ModalProvider";
import { playSound, Sound } from "@/game/sounds";
import styles from "./HeaderSection.module.css";

/** Which menu rows open which modal. Rows left out are toggles. */
const MENU_MODALS: Partial<Record<string, ModalId>> = {
  [MenuItemId.ProvablyFair]: ModalId.ProvablyFair,
  [MenuItemId.HowToPlay]: ModalId.HowToPlay,
  [MenuItemId.FreeBet]: ModalId.BetType,
  [MenuItemId.Limits]: ModalId.Limits,
  [MenuItemId.Chat]: ModalId.Chat,
};

/**
 * App bar: the live balance and the menu, both right-aligned. The left of the
 * bar is intentionally empty — that is the operator's logo slot.
 */
export const HeaderSection = () => {
  const balance = useBalance();
  const { currency, decimals } = useMoney();
  const { open } = useModal();
  const [menuOpen, setMenuOpen] = useState(false);
  // The three switches are the SDK's: it owns their defaults, the
  // `?extraParams` override the operator can launch with, and their storage.
  const { settings, updateSetting } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useOnEscape(closeMenu, menuOpen);
  // The root holds the button as well as the menu, so a press on the button
  // reaches its own toggle instead of being read as "outside".
  useClickOutside(rootRef, closeMenu, menuOpen);

  const handleToggle = (id: string, checked: boolean) => {
    updateSetting(id as keyof GameSettings, checked);
    // The Toggle plays its own click, but not this one: at the moment it fired,
    // sound was still off. Answer after the setting lands so switching sound on
    // is confirmed the same way switching it off is.
    if (id === MenuItemId.Sound && checked) playSound(Sound.SmallButton);
  };

  const handleSelect = (id: string) => {
    closeMenu();
    const modal = MENU_MODALS[id];
    if (modal) open(modal);
  };

  return (
    <Header>
      <div className={styles["header-section"]} ref={rootRef}>
        <Balance amount={balance} currency={currency} decimals={decimals} />
        <MenuButton
          open={menuOpen}
          onClick={() => setMenuOpen((wasOpen) => !wasOpen)}
        />

        {menuOpen && (
          <Menu
            className={styles["header-section__menu"]}
            items={MENU_ITEMS}
            toggles={settings}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        )}
      </div>
    </Header>
  );
};
