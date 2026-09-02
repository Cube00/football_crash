import type { TranslationKey } from "@/i18n/types";

/** A term and what it means — the shape of every explanatory list here. */
export interface FairnessFact {
  termKey: TranslationKey;
  descriptionKey: TranslationKey;
}

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
