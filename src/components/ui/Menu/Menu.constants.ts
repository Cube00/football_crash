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
    label: "Sound",
    icon: `${ICONS}/Sound on.svg`,
    iconOff: `${ICONS}/Sound off.svg`,
  },
  {
    id: MenuItemId.Music,
    kind: MenuItemKind.Toggle,
    label: "Music",
    icon: `${ICONS}/Music.svg`,
  },
  {
    id: MenuItemId.Animation,
    kind: MenuItemKind.Toggle,
    label: "Animation",
    icon: `${ICONS}/Shape.svg`,
  },
  {
    id: MenuItemId.ProvablyFair,
    kind: MenuItemKind.Action,
    label: "Provably fair",
    icon: `${ICONS}/Check.svg`,
  },
  {
    id: MenuItemId.HowToPlay,
    kind: MenuItemKind.Action,
    label: "How to Play",
    icon: `${ICONS}/Info.svg`,
  },
  {
    id: MenuItemId.FreeBet,
    kind: MenuItemKind.Action,
    label: "Free Bet",
    icon: `${ICONS}/Ticket.svg`,
  },
  {
    id: MenuItemId.Limits,
    kind: MenuItemKind.Action,
    label: "Limits",
    icon: `${ICONS}/Coin.svg`,
  },
  {
    id: MenuItemId.Chat,
    kind: MenuItemKind.Action,
    label: "Chat",
    icon: `${ICONS}/Chat.svg`,
  },
];
