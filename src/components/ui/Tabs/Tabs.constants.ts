export const TabsVariant = {
  /** Full-width pill bar — the primary tab row. */
  Segmented: "segmented",
  /** Centered, label-only tabs — nested inside a tab's content. */
  Text: "text",
} as const;

export type TabsVariant = (typeof TabsVariant)[keyof typeof TabsVariant];
