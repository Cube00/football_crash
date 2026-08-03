import type { TranslationKey } from "@/i18n/types";

interface StateRow {
  labelKey: TranslationKey;
  /** Literal value, for what the engine does not expose yet. */
  value?: string;
  /** Translated value, for the ones that read as words rather than data. */
  valueKey?: TranslationKey;
  /** Keeps the label on one line however narrow the column gets. */
  nowrap?: boolean;
}

/** A term and what it means — the shape of every explanatory list here. */
export interface FairnessFact {
  termKey: TranslationKey;
  descriptionKey: TranslationKey;
}

/**
 * The two state tables: four label/value pairs each. A pair is one column of
 * the desktop table and one row of the mobile list, so the copy lives here
 * rather than in a shape that only one of the two layouts can read.
 *
 * Placeholder values until the engine exposes the round's seeds.
 */
export const HIDDEN_STATE_ROWS: readonly StateRow[] = [
  { labelKey: "provablyFair.roundNumber", value: "1", nowrap: true },
  { labelKey: "provablyFair.serverKey", valueKey: "provablyFair.hidden" },
  { labelKey: "provablyFair.crashPoint", valueKey: "provablyFair.hidden" },
  { labelKey: "provablyFair.provablyFairHash", value: "8f3a2b9c7d1e..." },
];

export const REVEALED_STATE_ROWS: readonly StateRow[] = [
  { labelKey: "provablyFair.roundNumber", value: "1", nowrap: true },
  { labelKey: "provablyFair.serverKey", value: "7k9mX2pQ4nR8wL..." },
  { labelKey: "provablyFair.crashPoint", value: "2.45x" },
  { labelKey: "provablyFair.provablyFairHash", value: "8f3a2b9c7d1e..." },
];

/** What the player can check before the round runs. */
export const HIDDEN_FACTS: readonly FairnessFact[] = [
  {
    termKey: "provablyFair.roundNumber",
    descriptionKey: "provablyFair.roundNumberDescription",
  },
  {
    termKey: "provablyFair.provablyFairHash",
    descriptionKey: "provablyFair.provablyFairHashDescription",
  },
];

/** What the round hands back once it has ended. */
export const REVEALED_FACTS: readonly FairnessFact[] = [
  {
    termKey: "provablyFair.serverKey",
    descriptionKey: "provablyFair.serverKeyDescription",
  },
  {
    termKey: "provablyFair.crashPoint",
    descriptionKey: "provablyFair.crashPointDescription",
  },
  {
    termKey: "provablyFair.provablyFairHash",
    descriptionKey: "provablyFair.hashUnchangedDescription",
  },
];

/** The four inputs the hash is built from, in the order the formula uses. */
export const FAIRNESS_PARAMETERS: readonly FairnessFact[] = [
  {
    termKey: "provablyFair.roundNumber",
    descriptionKey: "provablyFair.roundNumberParameter",
  },
  {
    termKey: "provablyFair.serverKey",
    descriptionKey: "provablyFair.serverKeyParameter",
  },
  {
    termKey: "provablyFair.crashPoint",
    descriptionKey: "provablyFair.crashPointParameter",
  },
  {
    termKey: "provablyFair.provablyFairHash",
    descriptionKey: "provablyFair.hashParameter",
  },
];
