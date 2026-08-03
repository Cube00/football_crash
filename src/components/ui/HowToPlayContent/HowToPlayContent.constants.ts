import type { TranslationKey } from "@/i18n/types";

const IMAGES = "/assets/howtoplay";

/**
 * The modal is a document, so it is described as one: a list of blocks the
 * component knows how to render. Anything the copy needs — a paragraph, a
 * numbered list, a screenshot, the worked example — is a block, which keeps the
 * component a renderer and leaves the content editable in one place.
 */
export type HowToPlayBlock =
  | { kind: "text"; key: TranslationKey }
  | { kind: "label"; key: TranslationKey }
  | { kind: "steps"; keys: readonly TranslationKey[] }
  | { kind: "example"; keys: readonly TranslationKey[] }
  | { kind: "toggle" }
  | {
      kind: "figure";
      src: string;
      /** Natural size, so the modal reserves the space before the file loads. */
      width: number;
      height: number;
      /** Cap from the design — several shots are far wider than they should sit. */
      maxWidth: number;
      altKey: TranslationKey;
    }
  | {
      kind: "group";
      titleKey: TranslationKey;
      blocks: readonly HowToPlayBlock[];
    };

export interface HowToPlaySection {
  titleKey: TranslationKey;
  blocks: readonly HowToPlayBlock[];
}

const steps = (
  prefix: string,
  count: number,
): readonly TranslationKey[] =>
  Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

export const HOW_TO_PLAY_SECTIONS: readonly HowToPlaySection[] = [
  {
    titleKey: "howToPlay.placingBets.title",
    blocks: [
      { kind: "steps", keys: steps("howToPlay.placingBets.step", 5) },
      {
        kind: "figure",
        src: `${IMAGES}/bettingpanel.webp`,
        width: 1006,
        height: 156,
        maxWidth: 1006,
        altKey: "a11y.betPanels",
      },
    ],
  },
  {
    titleKey: "howToPlay.cashingOut.title",
    blocks: [
      { kind: "steps", keys: steps("howToPlay.cashingOut.step", 5) },
      {
        kind: "figure",
        src: `${IMAGES}/gameplay.webp`,
        width: 2880,
        height: 1680,
        maxWidth: 900,
        altKey: "a11y.gameScreen",
      },
      { kind: "example", keys: steps("howToPlay.example.step", 3) },
    ],
  },
  {
    titleKey: "howToPlay.interface.title",
    blocks: [
      {
        kind: "group",
        titleKey: "howToPlay.interface.multipliers.title",
        blocks: [
          { kind: "text", key: "howToPlay.interface.multipliers.body" },
          {
            kind: "figure",
            src: `${IMAGES}/multiplayer.webp`,
            width: 720,
            height: 84,
            maxWidth: 720,
            altKey: "a11y.multiplierStrip",
          },
        ],
      },
      {
        kind: "group",
        titleKey: "howToPlay.interface.balance.title",
        blocks: [
          { kind: "text", key: "howToPlay.interface.balance.body" },
          {
            kind: "figure",
            src: `${IMAGES}/balance.webp`,
            width: 137,
            height: 65,
            maxWidth: 200,
            altKey: "a11y.balanceDisplay",
          },
        ],
      },
      {
        kind: "group",
        titleKey: "howToPlay.interface.panels.title",
        blocks: [
          { kind: "text", key: "howToPlay.interface.panels.body" },
          {
            kind: "steps",
            keys: steps("howToPlay.interface.panels.step", 4),
          },
        ],
      },
      {
        kind: "group",
        titleKey: "howToPlay.interface.buttons.title",
        blocks: [
          {
            kind: "steps",
            keys: steps("howToPlay.interface.buttons.step", 4),
          },
          {
            kind: "figure",
            src: `${IMAGES}/Bets.webp`,
            width: 720,
            height: 111,
            maxWidth: 720,
            altKey: "a11y.betButtons",
          },
        ],
      },
    ],
  },
  {
    titleKey: "howToPlay.advanced.title",
    blocks: [
      {
        kind: "group",
        titleKey: "howToPlay.advanced.autoBet.title",
        blocks: [
          { kind: "text", key: "howToPlay.advanced.autoBet.body" },
          { kind: "toggle" },
        ],
      },
      {
        kind: "group",
        titleKey: "howToPlay.advanced.autoCashOut.title",
        blocks: [
          { kind: "text", key: "howToPlay.advanced.autoCashOut.body" },
          { kind: "text", key: "howToPlay.advanced.autoCashOut.body2" },
          {
            kind: "figure",
            src: `${IMAGES}/autobet.webp`,
            width: 342,
            height: 274,
            maxWidth: 342,
            altKey: "a11y.autoCashOut",
          },
        ],
      },
      {
        kind: "group",
        titleKey: "howToPlay.advanced.autoplay.title",
        blocks: [
          { kind: "text", key: "howToPlay.advanced.autoplay.body" },
          { kind: "label", key: "howToPlay.advanced.autoplay.betSettings" },
          {
            kind: "steps",
            keys: steps("howToPlay.advanced.autoplay.betStep", 2),
          },
          { kind: "label", key: "howToPlay.advanced.autoplay.stopConditions" },
          {
            kind: "steps",
            keys: steps("howToPlay.advanced.autoplay.stopStep", 3),
          },
          {
            kind: "figure",
            src: `${IMAGES}/autobet.webp`,
            width: 342,
            height: 274,
            maxWidth: 342,
            altKey: "a11y.autoPlaySettings",
          },
        ],
      },
    ],
  },
  {
    titleKey: "howToPlay.history.title",
    blocks: [
      {
        kind: "group",
        titleKey: "howToPlay.history.charts.title",
        blocks: [
          { kind: "text", key: "howToPlay.history.charts.body" },
          {
            kind: "figure",
            src: `${IMAGES}/chart.webp`,
            width: 294,
            height: 537,
            maxWidth: 300,
            altKey: "a11y.historyChart",
          },
        ],
      },
      {
        kind: "group",
        titleKey: "howToPlay.history.list.title",
        blocks: [
          { kind: "text", key: "howToPlay.history.list.body" },
          {
            kind: "figure",
            src: `${IMAGES}/stats.webp`,
            width: 294,
            height: 537,
            maxWidth: 300,
            altKey: "a11y.historyList",
          },
        ],
      },
    ],
  },
  {
    titleKey: "howToPlay.liveBets.title",
    blocks: [
      { kind: "text", key: "howToPlay.liveBets.body" },
      { kind: "steps", keys: steps("howToPlay.liveBets.step", 4) },
      { kind: "text", key: "howToPlay.liveBets.footer" },
      {
        kind: "figure",
        src: `${IMAGES}/allbets.webp`,
        width: 291,
        height: 521,
        maxWidth: 300,
        altKey: "a11y.allBets",
      },
    ],
  },
  {
    titleKey: "howToPlay.myHistory.title",
    blocks: [
      { kind: "text", key: "howToPlay.myHistory.body" },
      { kind: "steps", keys: steps("howToPlay.myHistory.step", 7) },
      { kind: "text", key: "howToPlay.myHistory.footer" },
      {
        kind: "figure",
        src: `${IMAGES}/mybet.webp`,
        width: 291,
        height: 521,
        maxWidth: 300,
        altKey: "a11y.myBets",
      },
    ],
  },
];
