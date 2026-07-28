import { MenuItemKind } from "./Menu.types";
import type { MenuItem } from "./Menu.types";

const ICONS = "/assets/icons";

/** Every row the menu can show; the container decides what each one does. */
export const MenuItemId = {
  Sound: "sound",
  Music: "music",
  Animation: "animation",
  ProvablyFair: "provably-fair",
  HowToPlay: "how-to-play",
  FreeBet: "free-bet",
  Limits: "limits",
  Chat: "chat",
} as const;

export type MenuItemId = (typeof MenuItemId)[keyof typeof MenuItemId];

export const MENU_ITEMS: readonly MenuItem[] = [
  {
    id: MenuItemId.Sound,
    kind: MenuItemKind.Toggle,
    labelKey: "menu.sound",
    icon: `${ICONS}/Sound on.svg`,
    iconOff: `${ICONS}/Sound off.svg`,
  },
  {
    id: MenuItemId.Music,
    kind: MenuItemKind.Toggle,
    labelKey: "menu.music",
    icon: `${ICONS}/Music.svg`,
  },
  {
    id: MenuItemId.Animation,
    kind: MenuItemKind.Toggle,
    labelKey: "menu.animation",
    icon: `${ICONS}/Shape.svg`,
  },
  {
    id: MenuItemId.ProvablyFair,
    kind: MenuItemKind.Action,
    labelKey: "menu.provablyFair",
    icon: `${ICONS}/Check.svg`,
  },
  {
    id: MenuItemId.HowToPlay,
    kind: MenuItemKind.Action,
    labelKey: "menu.howToPlay",
    icon: `${ICONS}/Info.svg`,
  },
  {
    id: MenuItemId.FreeBet,
    kind: MenuItemKind.Action,
    labelKey: "menu.freeBet",
    icon: `${ICONS}/Ticket.svg`,
  },
  {
    id: MenuItemId.Limits,
    kind: MenuItemKind.Action,
    labelKey: "menu.limits",
    icon: `${ICONS}/Coin.svg`,
  },
  {
    id: MenuItemId.Chat,
    kind: MenuItemKind.Action,
    labelKey: "menu.chat",
    icon: `${ICONS}/Chat.svg`,
  },
];
