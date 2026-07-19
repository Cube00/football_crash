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
} as const;

export type ModalId = (typeof ModalId)[keyof typeof ModalId];

export const MODAL_TITLES: Record<ModalId, string> = {
  [ModalId.ProvablyFair]: "Provably Fair",
  [ModalId.Limits]: "Limits",
  [ModalId.PointDetails]: "Point Details",
  [ModalId.BonusBet]: "",
  [ModalId.BonusSpin]: "",
  [ModalId.TotalWin]: "Total Win",
  [ModalId.BetType]: "Bet Type",
  [ModalId.Archive]: "Archive",
  [ModalId.HowToPlay]: "How To Play",
  [ModalId.AutoBet]: "Auto Bet",
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
};
