import { useCallback } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageProvider } from "@/sdk";
import type { Language } from "@/sdk";

/**
 * Feeds the SDK's `LanguageProvider` with i18next.
 *
 * The provider holds the language and keeps `?lang` in step with it; it does
 * not hold translations, so it takes `t` and `changeLanguage` from whichever
 * library the skin uses. `t` must come from `useTranslation()` and not from
 * `i18n.t` — the bare function gives React nothing to re-render on when the
 * language changes.
 *
 * This is also what replaced the skin's own language detection: the lobby hands
 * the game its language in the launch URL as `?lang`, which the SDK reads on
 * both sides — `LaunchService` for the session, this provider for the UI.
 */
export const I18nLanguageProvider = ({ children }: { children: ReactNode }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(
    (language: Language) => {
      void i18n.changeLanguage(language);
    },
    [i18n],
  );

  return (
    <LanguageProvider t={t} changeLanguage={changeLanguage}>
      {children}
    </LanguageProvider>
  );
};
