import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import { I18nLanguageProvider } from "./i18n/I18nLanguageProvider";
import { CurrencyProvider, DeviceProvider, SettingsProvider } from "@/sdk";
import App from "./App.tsx";

/**
 * The provider stack, in the order the integration docs give
 * (`.claude/sdk-docs/12-contexts.md`).
 *
 * TODO(sdk): once `@krash/sdk` / `@krash/react` / `sfs2x-api` are installed,
 * `KrashProvider` wraps all of this — it must be outermost, because
 * `CurrencyProvider` and `SettingsProvider` read the client and the session
 * from it, and so do `LaunchGate`, `SdkEventBridge` and every game hook:
 *
 *   import * as SFS2X from "sfs2x-api";
 *   import { KrashProvider } from "@krash/react";
 *
 *   <KrashProvider
 *     apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
 *     sfsHost={import.meta.env.VITE_SFS_HOST}
 *     gameId={import.meta.env.VITE_GAME_ID}
 *     sfs2xModule={SFS2X}
 *     renderError={(error, lobbyUrl) => <LaunchError error={error} lobbyUrl={lobbyUrl} />}
 *   >
 *     … the stack below …
 *   </KrashProvider>
 *
 * `GameConfigProvider` is not in the stack on purpose: it is inert until the
 * app copies `useGameConfig()` into it, and the skin reads that hook directly.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CurrencyProvider>
      <I18nLanguageProvider>
        <SettingsProvider>
          <DeviceProvider>
            <App />
          </DeviceProvider>
        </SettingsProvider>
      </I18nLanguageProvider>
    </CurrencyProvider>
  </StrictMode>,
);
