export const PlayNowBtnVariants = {
  Orange: "orange",
  Green: "green",
} as const;

export type btnVariants =
  (typeof PlayNowBtnVariants)[keyof typeof PlayNowBtnVariants];