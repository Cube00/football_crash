import type { TranslationKey } from "@/i18n/types";

interface HowToPlayImage {
  src: string;
  /** Natural size, so the modal reserves the space before the file loads. */
  width: number;
  height: number;
  altKey: TranslationKey;
}

interface HowToPlaySection {
  titleKey: TranslationKey;
  /** One key per step; fragments to bold are wrapped in `<b>` in the copy. */
  stepKeys: readonly TranslationKey[];
  image: HowToPlayImage;
}

export const HOW_TO_PLAY_SECTIONS: readonly HowToPlaySection[] = [
  {
    titleKey: "howToPlay.placingBets.title",
    stepKeys: [
      "howToPlay.placingBets.step1",
      "howToPlay.placingBets.step2",
      "howToPlay.placingBets.step3",
      "howToPlay.placingBets.step4",
      "howToPlay.placingBets.step5",
    ],
    image: {
      src: "/assets/Bets%201.png",
      width: 574,
      height: 89,
      altKey: "a11y.betPanels",
    },
  },
  {
    titleKey: "howToPlay.cashingOut.title",
    stepKeys: [
      "howToPlay.cashingOut.step1",
      "howToPlay.cashingOut.step2",
      "howToPlay.cashingOut.step3",
      "howToPlay.cashingOut.step4",
      "howToPlay.cashingOut.step5",
    ],
    image: {
      src: "/assets/Win%2024.png",
      width: 588,
      height: 136,
      altKey: "a11y.gameScreen",
    },
  },
];
