export const Size = {
  Web: "web",
  Mobile: "mobile",
} as const;

export type Size = (typeof Size)[keyof typeof Size];
