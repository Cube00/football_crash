import i18n from "i18next";
import { initReactI18next } from "react-i18next";
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

/**
 * No language detector.
 *
 * Choosing the language is the SDK's: the lobby hands the game a `?lang` in the
 * launch URL, `LaunchService` reads it for the session and `LanguageProvider`
 * reads it for the UI, keeping the parameter in step from then on. A second
 * detector here — on a different parameter, with its own localStorage memory —
 * could only disagree with that, and the disagreement would be silent.
 *
 * i18next therefore starts on the fallback and is switched by
 * `I18nLanguageProvider` on its first render, before anything is painted.
 */
i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // React escapes for us; escaping again would mangle currency and names.
  interpolation: { escapeValue: false },
});

export default i18n;
