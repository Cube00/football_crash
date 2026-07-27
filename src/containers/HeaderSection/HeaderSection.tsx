import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout";
import { Balance } from "@/components/ui/Balance";
import { MenuButton } from "@/components/ui/MenuButton";
import { Menu, MENU_ITEMS, MenuItemId } from "@/components/ui/Menu";
import { useOnEscape, useSettings } from "@/hooks";
import { useBalance } from "@/hooks/useGame";
import { useModal, ModalId } from "@/context/ModalProvider";
import { GAME_CONFIG } from "@/game/config";
import { settingsStore } from "@/game/settingsStore";
import { playSound, Sound } from "@/game/sounds";
import type { Settings } from "@/game/persistence";
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
  const { open } = useModal();
  const [menuOpen, setMenuOpen] = useState(false);
  // Shared, not local: the game area reads `animation` to decide whether to run
  // the canvas at all.
  const settings = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useOnEscape(closeMenu, menuOpen);

  // Dismiss on any press outside the menu or its button.
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen, closeMenu]);

  const handleToggle = (id: string, checked: boolean) => {
    settingsStore.set(id as keyof Settings, checked);
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
        <Balance amount={balance} currency={GAME_CONFIG.currency} />
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
