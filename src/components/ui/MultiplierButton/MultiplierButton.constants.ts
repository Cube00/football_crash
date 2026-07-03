export const MultiplierButtonVariant = {
  White: "white",
  LightBlue: "lightBlue",
  Blue: "blue",
  Yellow: "yellow",
  Green: "green",
} as const;

export type MultiplierButtonVariant =
  (typeof MultiplierButtonVariant)[keyof typeof MultiplierButtonVariant];
