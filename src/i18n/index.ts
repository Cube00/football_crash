import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ka from "./locales/ka.json";

export const DEFAULT_LANGUAGE = "en";

/** Every locale with a file in `./locales`. Add one and list it here. */
export const SUPPORTED_LANGUAGES = ["en", "ka"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * One namespace ("translation") holding the whole app, grouped by area. The
 * game is a single screen — splitting it into lazily fetched namespaces would
 * buy nothing and cost a request mid-round.
 */
export const resources = {
  en: { translation: en },
  ka: { translation: ka },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    // React escapes for us; escaping again would mangle currency and names.
    interpolation: { escapeValue: false },
    detection: {
      // `?lng=ka` wins, so a lobby can hand the game its language in the URL;
      // the player's own choice is remembered after that.
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lng",
      lookupLocalStorage: "football-crash:lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
