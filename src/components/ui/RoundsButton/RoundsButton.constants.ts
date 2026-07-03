export const RoundsButtonVariants = {
  Default: "default",
  Click: "click",
  Stop: "stop",
} as const;

export type roundsButtonVariants =
  (typeof RoundsButtonVariants)[keyof typeof RoundsButtonVariants];
