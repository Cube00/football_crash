<!-- source: https://krash-sdk-docs.playcore.live/en/12-contexts/ -->

# 12. React Contexts

Besides `KrashProvider`, `@krash/react` provides 5 additional providers (`packages/react/src/contexts/`): device, settings, currency, game config, language. All are optional — enable only those you use. They do **not** change the SDK store; this is UI-level state that most skins usually need.

| Provider | Hook | Needs `KrashProvider`? | URL | popstate |
| `DeviceProvider` | `useDevice()` | No | `?platform` / `?device` (hint) → rewritten once | No |
| `SettingsProvider` | `useSettings()` | Preferably (does not persist without a token) | `?extraParams` (JSON, read-only) | No |
| `CurrencyProvider` | `useCurrency()` | **Yes** (`useKrashClient`) | `?currency` (read + write) | Yes |
| `GameConfigProvider` | `useGameConfigContext()` | No | — | — |
| `LanguageProvider` | `useLanguage()` | No | `?lang` (read + write) | Yes |

## Provider Stack

The reference implementation's provider tree:
```
<KrashProvider apiBaseUrl={API_BASE_URL} sfsHost={SFS_HOST} gameId={GAME_ID}
               sfs2xModule={SFS2X} debug={false}
               renderError={(error, lobbyUrl) => <LaunchErrorScreen error={error} lobbyUrl={lobbyUrl} />}>
  <CurrencyProvider>
    <I18nLanguageProvider>        {/* LanguageProvider + react-i18next, see below */}
      <SettingsProvider>
        <GameConfigProvider>
          <DeviceProvider>
            <NavigationProvider>  {/* the app's own popup/sidebar state */}
              <App />

```

Rules: `CurrencyProvider` and `SettingsProvider` inside `KrashProvider` (the first throws an error via `useKrashClient()`, the second reads `KrashContext` via `useContext` and simply does not persist without it). The position of the other three does not matter.

---

## DeviceContext

`packages/react/src/contexts/DeviceContext.tsx`. The mobile/desktop decision is made **once, on mount**.
```
import { DeviceProvider, useDevice, Platform } from '@krash/react';

const { platform, isMobile, isDesktop, setPlatform } = useDevice();
// platform: Platform.Mob ('mobile') | Platform.Desk ('desktop')

```

### Detection

1. From the URL `?platform`, if absent — `?device` (`:23-34`). Aliases are accepted: `mobile|mob|m|0` → mobile, `desktop|desk|d|1` → desktop (`packages/sdk/src/launch/platform.ts:8-9`). Any other value = no hint.
1. Runtime detect — `detectPlatform()` (`platform.ts:34-52`): mobile if **any** of these is true — UA regex (`Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini`), `(pointer: coarse)`, or `innerWidth < 700`. On SSR `'desktop'`. (The file comment at `:31` says 1024 — it is outdated, the code is 700.)
1. **The URL hint is not an override.** If the hint and the runtime detect disagree, **the runtime detect wins** (`DeviceContext.tsx:44-48`) — some operators put `platform=desktop` on every launch URL and this was breaking mobile users. Since `detectPlatform()` always returns some value, the hint never changes the final result — **the device decides, the URL only shows up in the log.**
1. `console.log('[Krash] Device detected on game open', {...})` is always printed (`:50-64`), even without debug.

### URL rewrite

After mount, a single effect (`:72-86`) fixes the URL with `history.replaceState`: `platform=mobile|desktop` (the final value) and the `device` parameter is removed. **It does not listen to popstate** — the platform does not change on back/forward. `setPlatform()` changes the state, not the URL.

### Gotchas

- A touch-screen laptop (`pointer: coarse`) → mobile. An iPad with a desktop-mode UA → coarse pointer → mobile.
- It does not react to resize — narrowing a desktop window will not switch to mobile. For a responsive layout add `useMediaQuery`.
- LaunchService sends `platform` to the API separately (`resolvePlatformForApi`: URL raw or detect) — this is not related to the context.

---

## SettingsContext

`packages/react/src/contexts/SettingsContext.tsx`. Sound/music/animation toggles, localStorage.
```
import { SettingsProvider, useSettings, type GameSettings } from '@krash/react';

const { settings, updateSetting, toggleSetting } = useSettings();
// settings: GameSettings = { sound: boolean; music: boolean; animation: boolean }  (default all true)
toggleSetting('sound');
updateSetting('animation', false);

```

### Storage and lifecycle

- Key: `krash.settings:<sessionToken>` (`:41-43`). `sessionToken` is read from `KrashContext.session` — the provider must be inside `KrashProvider`.
- Initial state: defaults + `?extraParams` (`:119-122`). When the session appears (`launchStatus === 'ready'`) an effect (`:131-137`): GC → load the stored value → `{ ...DEFAULT, ...stored, ...urlOverrides }`. **The URL override always wins over the stored value.**
- **A write without a token is lost** (`:143-144`, `:154-155`): `updateSetting`/`toggleSetting` change the state, but write to localStorage only if `sessionTokenRef` is already set. Moreover — when the session appears, the effect described above **overwrites** the state with stored+defaults, so a toggle made during launch (splash) disappears. Do not show the settings UI before the launch has finished.
- GC (`:92-112`): on token bind, the legacy `krash.settings` and all other `krash.settings:*` keys are removed. Since `sessionToken` is new on every new launch, stored settings **practically live within a single session** (a page refresh with the same `t` token restores the session from storage — then they stay; a new launch from the lobby — they are removed). For per-user persistence use your own key (with `username`, like the SDK's `PersistentState`).

### `?extraParams`

JSON, e.g. `?extraParams={"sound":false,"music":false}` (URL-encoded). Only `boolean` fields are read (`:45-59`); other keys are ignored. Read-only — the context never writes to the URL.

---

## CurrencyContext

`packages/react/src/contexts/CurrencyContext.tsx`. Display currency (for label/format). It does **not** change the SDK's bet currency — that is set from `LaunchSession.currency`/`GameConfig.currencyCode` via `BettingEngine.setCurrency` (`KrashClient.ts:180-186, 269-273`).
```
import { CurrencyProvider, useCurrency } from '@krash/react';

const { currency, setCurrency } = useCurrency();
// currency: string — uppercase code, e.g. 'USD', 'GEL'

```

### Sources and order

1. **Init** (`:55-59`): `?currency` (trim + uppercase), otherwise `'USD'`.
1. **Session** (`:71-82`): an effect on `[client]` reads `client.getSession()?.currency` **once, on mount**. Launch is asynchronous, so at the moment of mount the session is usually still `null` and this step does nothing. It works only if `CurrencyProvider` is mounted after the launch.
1. **`'game-config'` event** (`:85-91`): `config.currencyCode` → `setCurrency`. **This is the real server-driven source** — `GameConfig` arrives after LOGIN on every (re)connect.
1. **popstate** (`:94-106`): reads from the URL; when `?currency` is absent, changes nothing.
1. **`setCurrency(code)`** — normalize + state + URL.

### URL

Every change (`setCurrency`, `game-config`, session) writes `?currency=<lowercase>` with `history.replaceState` (`:40-48`). A change coming from popstate is not written to the URL (it came from there anyway).

---

## GameConfigContext

`packages/react/src/contexts/GameConfigContext.tsx`. **Inert**: it does not listen to the SDK and loads nothing itself. Its only purpose is defaults until `GameConfig` arrives + an `isLoaded` flag; the application must fill it in with `updateConfig`.
```
import { GameConfigProvider, useGameConfigContext } from '@krash/react';

const { config, isLoaded, updateConfig, resetConfig } = useGameConfigContext();
// config: GameConfig — DEFAULT_GAME_CONFIG until you call updateConfig
// isLoaded: false → true on the first updateConfig; resetConfig → false
// updateConfig: (next: Partial<GameConfig>) => void  — shallow merge

```

Default (`:17-25`): `{ minBet: 1, maxBet: 1000, maxWinAmount: 10000, maxBetsPerUser: 1, currencyCode: 'USD', hasMoreOptions: false, currencyMinorUnits: 2 }` — no `clientConfig`/`configUpdatedAt`.

The reference implementation fills it like this (in its betting adapter hook):
```
const gameConfigCtx = useGameConfigContext();
const sdkGameConfig = useGameConfig();

// Sync game config from SDK to context
useEffect(() => {
  if (sdkGameConfig) {
    gameConfigCtx.updateConfig(sdkGameConfig);
  }
}, [sdkGameConfig]);

```

Without this, `useGameConfigContext().config` will stay on the defaults forever. Alternative: do not use the context at all and write `useGameConfig() ?? DEFAULTS` where you need it. `useGameConfig()` — `null` until loaded, real data afterwards (06).

---

## LanguageContext

`packages/react/src/contexts/LanguageContext.tsx`. Language state + URL sync + an adapter for the i18n library. **It does not store translations itself.**
```
import { LanguageProvider, useLanguage, Language, type TFunction } from '@krash/react';

<LanguageProvider t={t} changeLanguage={(lang) => i18n.changeLanguage(lang)}>

const { language, setLanguage, t } = useLanguage();
setLanguage(Language.KA);
t('freeBet.completedTitle');

```

```
enum Language {
  DE = 'de', EN = 'en', ES = 'es', FR = 'fr', HI = 'hi', ID = 'id',
  IT = 'it', JA = 'ja', KA = 'ka', PT = 'pt', PT_BR = 'pt-BR', RU = 'ru',
}
type TFunction = (key: string, options?: any) => string;

```

### Lifecycle

- **Init** (`:42-62`): `?lang` must exactly match an enum value (case-sensitive: `pt-BR`, not `pt-br`); otherwise `EN`. `?lang=en-US` will not count.
- `changeLanguage(initial)` is called **in the `useState` initializer, during render** (`:87-91`) — a side effect in render; twice in `StrictMode`. Then also in the same effect (`:93-94`). Harmless for i18next (idempotent), keep it in mind for a custom adapter.
- **Effect** on `[language, changeLanguage]` (`:93-107`): `changeLanguage(language)` + URL: on `EN` `?lang` is **removed**, otherwise `?lang=<value>` is written (`replaceState`).
- **popstate** (`:109-121`): synchronisation from the URL; when `?lang` is absent → `EN`.
- When the props are absent, `t` = identity (returns the key), `changeLanguage` = no-op — the context works even without an i18n library.

### i18next wiring — reference implementation

The `t` prop must come **from react-i18next's `useTranslation()`** and not from `i18n.t` directly: `i18n.t` does not give React a re-render on language change, `useTranslation` does. That is why the reference implementation wraps `LanguageProvider` in a wrapper:
```
import { useTranslation } from 'react-i18next';
import { LanguageProvider } from '@krash/react';

/** Wraps LanguageProvider with i18next's t and changeLanguage. */
function I18nLanguageProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <LanguageProvider t={t} changeLanguage={(lang) => i18n.changeLanguage(lang)}>
      {children}
    </LanguageProvider>
  );
}

```

i18next itself is initialised in the entry file (`import './i18n/config'`, before the provider tree). `changeLanguage` is an inline arrow — a new reference on every `I18nLanguageProvider` render, so the `[language, changeLanguage]` effect re-runs (`i18n.changeLanguage` to the same language + `replaceState`). It is cheap, but `useCallback` is cleaner.

---

## URL Synchronization

| Param | Context | Read | Write | popstate |
| `?platform`, `?device` | Device | on mount, hint (runtime detect wins) | once: `platform=mobile\|desktop`, `device` removed | No |
| `?extraParams={…}` | Settings | on mount + on session bind; boolean fields | never | No |
| `?currency` | Currency | on mount + popstate; uppercase | on every change, lowercase | Yes |
| `?lang` | Language | on mount + popstate; exact enum value | on every change; `en` → the parameter is removed | Yes |

All writes are `history.replaceState` — no history entry is added. Only Currency and Language react to back/forward.

The SDK's `LaunchService` reads the same URL with its own parameters (`t`, `gid`, `lang`, `platform`, `currency`, `lobbyUrl`, `exitUrl`, `userId`, `mode`) separately — the contexts do not affect it, except that they change/normalise the values of `platform`/`currency`/`lang`. On refresh LaunchService will see the already normalised values.

---

## Using them together

```
import * as SFS2X from 'sfs2x-api';
import { useTranslation } from 'react-i18next';
import {
  KrashProvider, DeviceProvider, SettingsProvider,
  CurrencyProvider, GameConfigProvider, LanguageProvider,
} from '@krash/react';
import './i18n';   // i18next init

function I18nLanguageProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <LanguageProvider t={t} changeLanguage={(lang) => i18n.changeLanguage(lang)}>
      {children}
    </LanguageProvider>
  );
}

export function Root() {
  return (
    <KrashProvider
      apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
      sfsHost={import.meta.env.VITE_SFS_HOST}
      gameId={import.meta.env.VITE_GAME_ID}
      sfs2xModule={SFS2X}
      renderError={(error, lobbyUrl) => <ErrorScreen error={error} lobbyUrl={lobbyUrl} />}
    >
      <CurrencyProvider>
        <I18nLanguageProvider>
          <SettingsProvider>
            <GameConfigProvider>
              <DeviceProvider>
                <Game />
              </DeviceProvider>
            </GameConfigProvider>
          </SettingsProvider>
        </I18nLanguageProvider>
      </CurrencyProvider>
    </KrashProvider>
  );
}

```

`renderError` **replaces** the children on error — the provider tree is not rendered then.

## Custom Contexts

Add your own UI state (e.g. a `NavigationContext` — active modal, sidebar, popup) inside `KrashProvider` so it has access to `useKrashClient()`:
```
<KrashProvider …>
  <CurrencyProvider>
    <YourNavigationProvider>
      <App />
    </YourNavigationProvider>
  </CurrencyProvider>
</KrashProvider>

```

`KrashContext` itself is also exported — if you want to replace `KrashProvider` (e.g. your own launch flow), providing the same `KrashProviderState` is enough for all hooks to work.

## Common mistakes

- Expecting a mobile device to launch "as desktop" with `?platform=desktop` — the runtime detect wins.
- `useSettings().toggleSetting` on the splash — the write is lost and is overwritten on session bind.
- `LanguageProvider t={i18n.t}` — the UI does not update on language change; use `useTranslation().t`.
- Waiting for `useGameConfigContext().isLoaded` without calling `updateConfig` — `false` forever.
- Treating `useCurrency().currency` as the bet currency — the bet currency is in the SDK (`GameConfig.currencyCode`); display and bet currency coincide only because both come from `game-config`.
 Made with  Material for MkDocs

