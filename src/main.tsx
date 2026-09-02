import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App.tsx";

/**
 * TODO(sdk): once `@krash/sdk` / `@krash/react` / `sfs2x-api` are installed,
 * `KrashProvider` wraps `<App />` here — it must be the outermost provider,
 * because `LaunchGate`, `SdkEventBridge` and every game hook read from it:
 *
 *   import * as SFS2X from "sfs2x-api";
 *   import { KrashProvider } from "@krash/react";
 *
 *   <KrashProvider
 *     apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
 *     sfsHost={import.meta.env.VITE_SFS_HOST}
 *     gameId={import.meta.env.VITE_GAME_ID}
 *     sfs2xModule={SFS2X}
 *   >
 *     <App />
 *   </KrashProvider>
 *
 * See `docs/SDK-INTEGRATION.md` for the env vars and the optional contexts.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
