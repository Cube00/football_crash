import type { TranslationKey } from "@/i18n/types";
import { ModalWidth } from "@/components/ui/Modal";

export const ModalId = {
  ProvablyFair: "provably-fair",
  Limits: "limits",
  PointDetails: "point-details",
  BonusBet: "bonus-bet",
  BonusSpin: "bonus-spin",
  TotalWin: "total-win",
  BetType: "bet-type",
  Archive: "archive",
  HowToPlay: "how-to-play",
  AutoBet: "auto-bet",
  Chat: "chat",
} as const;

export type ModalId = (typeof ModalId)[keyof typeof ModalId];

/**
 * Heading each modal shows, as a translation key. The bonus dialogs carry their
 * heading in their own artwork, so their key resolves to an empty string.
 */
export const MODAL_TITLE_KEYS: Record<ModalId, TranslationKey> = {
  [ModalId.ProvablyFair]: "modals.provablyFair",
  [ModalId.Limits]: "modals.limits",
  [ModalId.PointDetails]: "modals.pointDetails",
  [ModalId.BonusBet]: "modals.bonusBet",
  [ModalId.BonusSpin]: "modals.bonusSpin",
  [ModalId.TotalWin]: "modals.totalWin",
  [ModalId.BetType]: "modals.betType",
  [ModalId.Archive]: "modals.archive",
  [ModalId.HowToPlay]: "modals.howToPlay",
  [ModalId.AutoBet]: "modals.autoBet",
  [ModalId.Chat]: "modals.chat",
};

/**
 * Modals reached from another modal. The child shows a back arrow that returns
 * here instead of closing the stack.
 */
export const MODAL_PARENTS: Partial<Record<ModalId, ModalId>> = {
  [ModalId.Archive]: ModalId.BetType,
};

export const MODAL_WIDTHS: Partial<Record<ModalId, ModalWidth>> = {
  [ModalId.ProvablyFair]: ModalWidth.Xxl,
  [ModalId.Limits]: ModalWidth.Xl,
  [ModalId.PointDetails]: ModalWidth.Xl,
  [ModalId.BonusBet]: ModalWidth.Sm,
  [ModalId.BonusSpin]: ModalWidth.Sm,
  [ModalId.TotalWin]: ModalWidth.Sm,
  [ModalId.BetType]: ModalWidth.Md,
  [ModalId.Archive]: ModalWidth.Md,
  [ModalId.HowToPlay]: ModalWidth.Xl,
  [ModalId.AutoBet]: ModalWidth.Lg,
  [ModalId.Chat]: ModalWidth.Md,
};
