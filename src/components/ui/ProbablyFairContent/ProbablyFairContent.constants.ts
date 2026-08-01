import type { TranslationKey } from "@/i18n/types";

interface HiddenStateRow {
  labelKey: TranslationKey;
  /** Literal value, for what the engine does not expose yet. */
  value?: string;
  /** Translated value, for the ones that read as words rather than data. */
  valueKey?: TranslationKey;
  /** Keeps the label on one line however narrow the column gets. */
  nowrap?: boolean;
}

/**
 * The hidden-state table: four label/value pairs. A pair is one column of the
 * desktop table and one row of the mobile list, so the copy lives here rather
 * than in a shape that only one of the two layouts can read.
 *
 * Placeholder values until the engine exposes the round's seeds.
 */
export const HIDDEN_STATE_ROWS: readonly HiddenStateRow[] = [
  { labelKey: "provablyFair.roundNumber", value: "1", nowrap: true },
  { labelKey: "provablyFair.serverKey", valueKey: "provablyFair.hidden" },
  { labelKey: "provablyFair.crashPoint", valueKey: "provablyFair.hidden" },
  { labelKey: "provablyFair.provablyFairHash", value: "8f3a2b9c7d1e..." },
];
