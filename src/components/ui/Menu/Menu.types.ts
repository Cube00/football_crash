import type { HTMLAttributes } from "react";
import type { TranslationKey } from "@/i18n/types";

/** A row is either a setting you flip, or something you open. */
export const MenuItemKind = {
  Toggle: "toggle",
  Action: "action",
} as const;

export type MenuItemKind = (typeof MenuItemKind)[keyof typeof MenuItemKind];

interface MenuItemBase {
  id: string;
  /** Translation key for the row's label; the menu resolves it when rendering. */
  labelKey: TranslationKey;
  /** Path to a monochrome SVG; it is recoloured to match the row. */
  icon: string;
}

export interface MenuToggleItem extends MenuItemBase {
  kind: typeof MenuItemKind.Toggle;
  /** Shown instead of `icon` while the toggle is off, where the set has one. */
  iconOff?: string;
}

export interface MenuActionItem extends MenuItemBase {
  kind: typeof MenuItemKind.Action;
}

export type MenuItem = MenuToggleItem | MenuActionItem;

// `onSelect` and `onToggle` are also DOM handler names, hence the Omit.
export interface MenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect" | "onToggle"> {
  items: readonly MenuItem[];
  /** Current state of every toggle row, keyed by item id. */
  toggles: Readonly<Record<string, boolean>>;
  onToggle: (id: string, checked: boolean) => void;
  onSelect: (id: string) => void;
}
