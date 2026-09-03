<!-- source: https://krash-sdk-docs.playcore.live/en/14-reference-implementation/ -->

# 14. Reference implementation — architecture

The reference implementation is a Krash skin running in production (React 19 + Vite 7 + TypeScript, with Phaser 3 + Spine visuals), built on `@krash/sdk` + `@krash/react`. This chapter is an architecture map — which layer does what, where the SDK ends and where the skin's UI policy begins. Panel-by-panel details are in `docs/panels/01..17` (index at the end).

The snippets are examples taken from the reference implementation. Identifiers that the SDK does not export (`useBettingContext()`, `EventBus`, `NavigationProvider`, `useNavigation`, …) are the skin's own and are explained where they first appear.

## Recommended skin folder structure

```
my-skin/
├── index.html                     — <div id="root">, viewport maximum-scale=1
├── vite.config.ts                 — react-swc, precompress plugin, manualChunks, vitest
├── Dockerfile                     — multi-stage (node:22 → nginx:alpine)
├── nginx.conf                     — gzip_static, immutable /assets/, SPA fallback
├── package.json, tsconfig.json / tsconfig.app.json
├── public/assets/                 — spine, audio, logos (runtime paths /assets/...)
└── src/
    ├── main.tsx                   — provider stack (below)
    ├── vite-env.d.ts              — ImportMetaEnv (VITE_API_BASE_URL, VITE_SFS_HOST, VITE_GAME_ID)
    ├── global.d.ts                — __APP_VERSION__, __BUILD_DATE__
    ├── index.css, styles/variables.css
    ├── app/                       — shell and glue
    │   ├── App.tsx                — loader gate + layout tree (below)
    │   ├── AppShell.tsx           — wrapper classes (mobile / frozen / animation-off) + Footer
    │   ├── SdkEventBridge.tsx     — SDK events → the skin's event bus
    │   ├── BettingEngine.tsx      — context around the adapter hook (below)
    │   ├── ToastArea.tsx          — WinToast, outside BettingEngine
    │   └── NavigationContext.tsx  — popup / sidebar state (the skin's own)
    ├── game/                      — canvas layer (optional)
    │   ├── EventBus.ts            — Phaser.Events.EventEmitter singleton
    │   ├── main.ts                — Phaser config (WEBGL, RESIZE, fps 30)
    │   ├── PhaserGame.tsx         — Phaser instance wrapper (deferred init, resize)
    │   ├── scenes/Game.ts         — the only scene
    │   └── helpers/GameResolution.ts — 1920×1080 world singleton
    ├── panels/                    — one folder per panel chapter (docs/panels/01..17)
    │   ├── loader/                — MainLoader, LaunchErrorScreen, OrientationLockOverlay
    │   ├── header/                — Header, BalanceDisplay, MultiplierHistory, MultiplierPill
    │   ├── multiplier/            — MultiplierDisplay, countdown Loader
    │   ├── betting/               — BettingPanel, PlaceBet, BetButton, CashoutGuardedBetButton, AutoPlay/
    │   ├── freebet/               — FreeBet list, FreeBetBonus, FreeBetModalTrigger
    │   ├── history/               — MyBets, BettingHistory (live feed), Statistic, StatisticsChart, RoundsSelector
    │   ├── info/                  — RoundInfoContent, ProvablyFairContent, HowToPlayContent
    │   ├── settings/              — SettingsPanel
    │   ├── network/               — ConnectionLostOverlay, NetworkStatus
    │   └── mobile/                — MobilePopup, Popup, CustomKeyboard, SideMenu
    ├── ui/                        — presentational atoms: IconButton, Toggle, Switcher, TabSwitcher,
    │                                SvgIcon, CountBadge, MoneyButton, WinToast, icons/
    ├── hooks/
    │   ├── useBettingManagerSDK.ts — adapter hook over the SDK (below)
    │   ├── useBettingHistory.ts   — live bets feed store (module-level)
    │   ├── useNavigation.ts       — reads NavigationContext
    │   └── useSoundEffects.ts, useSoundManager.ts, useTick.ts, useWakeLock.ts
    ├── i18n/config.ts + locales/{de,en,es,fr,hi,id,it,ja,ka,pt,pt-BR,ru}.json
    ├── models/enums/              — Popups, SidebarArea, InfoPopupTypes, StatisticsTab,
    │                                NetworkStatusState; GamePhase/BetState/BetSlot/BetLayout/
    │                                BetButtonVariant/Platform — SDK re-export
    ├── constants/breakpoints.ts   — CSS media query strings (768/480/360)
    ├── utils/                     — classNames, host (openCashier, closeGame, popup titles),
    │                                domSetup (iOS viewport), infoContent
    └── test/setup.ts, **/__tests__/

```

Keep the SDK boundary visible: everything under `src/hooks/useBettingManagerSDK.ts` and `src/panels/` is UI policy; the SDK is imported only from `@krash/sdk` / `@krash/react`.

## Provider stack — `main.tsx`

Reference implementation — provider stack (no StrictMode; no `I18nextProvider` — i18next is initialised by the `./i18n/config` import and `useTranslation` works without it):
```
createRoot(document.getElementById('root')!).render(
  <KrashProvider
    apiBaseUrl={API_BASE_URL}
    sfsHost={SFS_HOST}
    gameId={GAME_ID}
    sfs2xModule={SFS2X}
    debug={false}
    renderError={(error, lobbyUrl) => (
      <LaunchErrorScreen error={error} lobbyUrl={lobbyUrl} />
    )}
  >
    <CurrencyProvider>
      <I18nLanguageProvider>
        <SettingsProvider>
          <GameConfigProvider>
            <DeviceProvider>
              <NavigationProvider>
                <App />
              </NavigationProvider>
            </DeviceProvider>
          </GameConfigProvider>
        </SettingsProvider>
      </I18nLanguageProvider>
    </CurrencyProvider>
  </KrashProvider>
);

```

`NavigationProvider` — the skin's own popup/sidebar state; `LaunchErrorScreen` — the skin's session-expired screen. `I18nLanguageProvider` supplies i18next's `t`/`changeLanguage` to the SDK's `LanguageProvider`:
```
function I18nLanguageProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <LanguageProvider t={t} changeLanguage={(lang) => i18n.changeLanguage(lang)}>
      {children}
    </LanguageProvider>
  );
}

```

Env: `VITE_API_BASE_URL` (fallback `https://<api-host>`), `VITE_SFS_HOST` (`<sfs-host>`), `VITE_GAME_ID` (fallback `kings_move` — the SDK's legacy default; always pass your own `gameId`). Declare all three in `vite-env.d.ts` under the same names the code reads.

## App tree — `App.tsx`

```
function App() {
  useRerenderProfiler('App');
  useSoundEffects();
  useWakeLock();

  const [loadApp, setLoadApp] = useState<boolean>(false);
  const [hideLoader, setHideLoader] = useState<boolean>(false);

  return (
    <>
        <OrientationLockOverlay />

        {!hideLoader && <MainLoader onHideLoader={() => setHideLoader(true)} onLoadApp={() => setLoadApp(true)} />}

        {
            loadApp && <>
                <SdkEventBridge />
                <ConnectionLostOverlay />
                <PhaserGameWrapper />

                <BettingEngine>
                  <AppShell>
                      <GameHeader />
                      <GameContent />
                      <MobilePopup />
                      <BetSlipPopups />
                      <DesktopInfoPopup />
                      <FreeBetModalTrigger />
                  </AppShell>
                </BettingEngine>

                <ToastArea />
            </>
        }
    </>
  );
}

```

`useRerenderProfiler` — the skin's dev-only render logger; `useSoundEffects`/`useWakeLock` — the skin's own hooks (panel 14, host integrations below).

Loader gate: `MainLoader` calls `onLoadApp(true)` immediately on mount, so the tree renders **immediately** under the loader. The loader waits for three `EventBus` events (`EventBus` — the skin's local `Phaser.Events.EventEmitter`) — `loader:server-connected` (SDK `server-connected`/first `connected`), `loader:authenticated` (`launchStatus === 'ready'`), `loader:assets-loaded` (the Phaser scene's first frame) — and a 15 s fallback; 600 ms after the last event `onHideLoader` → loader unmount. The reference implementation does **not** filter on `launchStatus` — `renderError` replaces the tree on error anyway.

| Component | Role | Panel |
| `OrientationLockOverlay` | portrait lock, in front of the loader | 17 |
| `MainLoader` | 3-gate loader | 01 |
| `SdkEventBridge` | SDK → EventBus | 16 |
| `ConnectionLostOverlay` | disconnected overlay | 15 |
| `PhaserGameWrapper` → `PhaserGame` | canvas | 16 |
| `BettingEngine` | `useBettingManagerSDK` (adapter hook) → context | below |
| `AppShell` | wrapper classes (`app--mobile`, `app--frozen`, animation-off), `Footer` | 14, 15 |
| `GameHeader` | `Header` (balance, settings, fullscreen, close) + `MultiplierHistory` | 02, 04 |
| `GameContent` | multiplier/loader, side menu, betting panels, desktop sidebars | 03, 05, 08 |
| `MobilePopup` | mobile popups | 17 |
| `BetSlipPopups` | AutoPlay popup per slot | 07 |
| `DesktopInfoPopup` | info + freebet modals (on mobile too) | 13, 09 |
| `FreeBetModalTrigger` | auto-opening of the credited/completed modal | 09 |
| `ToastArea` | `WinToast` — **outside** `BettingEngine` | below |

## `BettingEngine` + `useBettingManagerSDK`

`BettingEngine` — a single context that holds the result of `useBettingManagerSDK()` (`BettingManagerReturn`); components read it with `useBettingContext()`.

`useBettingManagerSDK` is an adapter hook over the SDK: it maps the SDK hooks onto one UI-facing `BettingManagerReturn` interface. What it uses from the SDK: `useKrashClient`, `usePhase`, `useBalance`, `useCrashedAt`, `useBetLayout`, `useIsGameFrozen`, `useWinDisplay`, `useHasActiveBets`, `useGameConfig`, `useFreerounds`, `useBetting(Slot1/Slot2)`, `useAutoPlay(Slot1/Slot2)`, `useCurrency`, `useGameConfigContext`.

What it returns: `phase`, `balance`, `betLayout`/`setBetLayout`, `winAmount`/`winTimestamp`/`clearWin`, `crashedAt`, `getSlotState(slot)`, `activeAutoPlaySlot`/`setActiveAutoPlaySlot`, `activeAutoPlayPopup`/`setActiveAutoPlayPopup`, `minBet`/`maxBet`, `quickBetAmounts`, `quickBetPresets`/`multiplyButton`/`betStep` (from the server `clientConfig`), `hasActiveBets`, `isGameFrozen`.

`getSlotState(slot)` builds a `SlotState` from `client.store.getSnapshot()` on every call: `bet`, `betInputAmount` (**overridden** in the freebet case), `hasPendingBet`, `isSending`, `betFailed`, `disabled`, `buttonState { variant, text, disabled, onClick, minCashoutGate? }`, `autoPlay`, `autoCashout { enabled, multiplier, onToggle, onMultiplierChange, canChangeMultiplier, minValue? }`, `onBet`, `onBetAmountChange`, `onStopAutoPlay` and others.

**UI policy (skin responsibility) in this hook — the SDK does not do this:**

| Rule | The SDK's fact |
| Range freebet clamp `[betMin, min(betMax, balanceRemaining)]` | The SDK only fixes the amount of a fixed grant |
| `minCashoutGate` → `CashoutGuardedBetButton` blocks cashout | The SDK does not stop cashout |
| Slot1/Slot2 freebet lock (reservation-based: pending/sending = 1 reservation; the last freebet goes to slot 1) | The SDK has no lock |
| Forcing the `Lost` variant in CRASHED | The SDK's variant may lag by a few ms |
| Insufficient balance → `openCashier()` + autoplay stop (in the adapter hook and in the betting panel) | The SDK does not check the balance |
| Per-slot freebet auto-cashout override + save/restore of the user's value in localStorage | The SDK's `updateConfig` persists directly, it does not know about freebets |
| Autoplay stop + auto-cashout `enabled: false` when the freebet finishes | The SDK stops autoplay on `freeround-completed`, but not the auto-cashout flag |
| `clientConfig` → `setBetInputAmount`, `defaultAutoCashout` (per `configUpdatedAt`) | The SDK only puts the config in the store |
| `GameConfigProvider.updateConfig(useGameConfig())` sync | The context is inert without this |

Full rules: 05, 06, 07, 09.

## Toasts

Reference implementation — the only toast area that is mounted:
```
export const ToastArea = memo(function ToastArea() {
  const { winAmount, winTimestamp, clearWin } = useWinDisplay();
  return (
    <div className='app__toast'>
      {winAmount && (
        <WinToast key={winTimestamp} amount={winAmount} onClose={clearWin} />
      )}
    </div>
  );
});

```

`WinToast` calls `onClose` → `client.clearWin()` after 2 s. `betFailed` is not a toast — it is shown as inline text under the bet button (on mobile — in the betting area of the main content).

## Hook naming vs the SDK

If you write your own history/connection hook, do not reuse the SDK hook names — a same-named local hook makes imports ambiguous (`'../hooks/useGameHistory'` vs `@krash/react`). The SDK shapes:

| `@krash/react` hook | Returns |
| `useGameHistory` | `{ items: GameHistoryItem[], fetch }` |
| `useConnectionStatus` | `{ state: ConnectionState, lagMs }` |

Give the skin-local hook a distinct name (`useRoundHistory`, `useNetworkStatus`) or wrap the SDK hook and re-export it under one name — but pick one and use it everywhere in the skin.

## localStorage keys

| Key | Who | What |
| `krash.game_state:<username>:<gameId>` | SDK | betInputAmounts, betLayout, autoplay config (`KrashClient.ts:203-213`, `PersistentState.ts:52-60`) |
| `krash.settings:<sessionToken>` | SDK `SettingsProvider` | sound/music/animation |
| `krash:debug` | SDK logger | `'1'` → debug |
| `skin:seenFreeroundGrants:<sessionToken>` | `FreeBetModalTrigger` (skin) | dedup of the credited modal |
| `skin:freebetSavedAutoCashout:slotN` | `useBettingManagerSDK` (skin) | the user's auto-cashout before the freebet (N = 1/2) |
| `skin:freebetMultiplierOverride:slotN` | `useBettingManagerSDK` (skin) | the multiplier chosen during the freebet |
| `i18nextLng` | i18next detector | language |
| `debug` | `useRerenderProfiler` (skin) | `'true'` → render log |

## Host integrations

| What | Code | Trigger |
| Cashier | `window.parent.postMessage('openCashier', '*')` | click on the balance (`BalanceDisplay`); insufficient balance before `placeBet` (betting panel + adapter hook) |
| Close game | `exitUrl` → `window.parent.location.href` (http/https only) | header button; shown only if `exitUrl` exists |
| Lobby | `lobbyUrl` → `closeGame()` | link on the error screen (`LaunchErrorScreen`) |
| Fullscreen | `documentElement.requestFullscreen()` / `exitFullscreen()` | header button (desktop only) |
| Clipboard | `navigator.clipboard.writeText` | `RoundInfoContent` — copying the round id/hash |
| Wake lock | `navigator.wakeLock.request('screen')` | `useWakeLock` hook (skin) |
| Demo relaunch | click on the logo (`isDemo`) → `relaunchDemo` | header logo |

`lobbyUrl`/`exitUrl` come from the SDK's `LaunchService.parseUrlParams` and live in `useKrashState()`.

## i18n

12 languages (`i18n/locales/`): `de en es fr hi id it ja ka pt pt-BR ru`. `i18n/config.ts`: `i18next-browser-languagedetector` (`order: ['localStorage','navigator']`, cache `i18nextLng`), `fallbackLng: 'en'`, `escapeValue: false`. The URL `?lang=` is handled by the SDK's `LanguageProvider` (`LanguageContext.tsx:45, 89-107`): it calls `changeLanguage` for the initial language, updates the URL on change (`en` → the param is removed), listens to `popstate`. The reference implementation's components use both: `useLanguage().t` (SDK context) and `useTranslation()`/`i18next.t` directly (outside React, e.g. in the popup-title helpers).

## Build & deploy

### `vite.config.ts`

- `@vitejs/plugin-react-swc`.
- A small **custom** `precompressAssets()` plugin — on `closeBundle` it creates `.gz` (level 9) and `.br` (quality 11) siblings for the `.js/.css/.html/.svg/.json/.map/.wasm/.txt/.xml` files (≥ 1 KiB) in `dist/` using `node:zlib`. `vite-plugin-compression` is **not** used.
- `define`: `__APP_VERSION__` (`npm_package_version`), `__BUILD_DATE__`.
- `build.chunkSizeWarningLimit: 1200`; `manualChunks` is a **function**, by path regex: `vendor-game` (phaser + `@esotericsoftware/spine-*`), `vendor-react` (react, react-dom, scheduler), `vendor-i18n`, `vendor-sfs` (`sfs2x-api`).
- `resolve.alias`: `VITE_E2E=true` → a local `sfs2x-api` mock module (for e2e tests).
- `test`: vitest, jsdom, `src/test/setup.ts`, CSS modules `non-scoped`.

```
manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/]node_modules[\\/](phaser|@esotericsoftware[\\/]spine-)/.test(id)) {
    return 'vendor-game';
  }
  if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
    return 'vendor-react';
  }
  if (/[\\/]node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/.test(id)) {
    return 'vendor-i18n';
  }
  if (/[\\/]node_modules[\\/]sfs2x-api[\\/]/.test(id)) {
    return 'vendor-sfs';
  }
  return undefined;
},

```

### `Dockerfile`

Generic single-app layout (the skin is its own package; `@krash/sdk` and `@krash/react` come from the registry):
```
# build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_SFS_HOST
ARG VITE_GAME_ID
RUN pnpm build

# runtime
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

```

The envs are baked in at build time — changing them at runtime requires a new image.

### `nginx.conf`

- `gzip_static on` + `gzip on` (on-the-fly fallback, level 6, min 1024, list of types). **No `brotli_static`** — `.br` files are created, but with this config they are not served (nginx:alpine has no brotli module).
- `/assets/` → `expires 1y`, `Cache-Control: public, immutable`, `try_files $uri =404`.
- `/` → `try_files $uri /index.html`; `= /index.html` → `no-cache, no-store, must-revalidate`; `error_page 404 /index.html`.

## Recommended patterns and patterns to avoid

| Recommended | See | Why |
| The order of the provider stack | §Provider stack | `SettingsProvider`/`LanguageProvider` need `KrashContext` |
| `I18nLanguageProvider` | §Provider stack | i18next ↔ SDK bridge in 8 lines |
| The loader's 3 gates + fallback | §App tree, 01 | "ready" ≠ "connected" |
| `renderError` + a dedicated error screen | §Provider stack | session-expired in one place |
| `clientConfig` → input seed per `configUpdatedAt` | §`BettingEngine`, 05 | does not overwrite the user's edit |
| Freebet X/Y formulas | 09 | range = amount, fixed = count |
| Seen-grants dedup for the credited modal (`skin:seenFreeroundGrants`) | §localStorage keys, 09 | the credited modal does not repeat on refresh |
| Deferred Phaser init (wait for a ≥ 64 px container) | 16 | iframe 0×0 |
| Vite `manualChunks` function, precompress | §Build & deploy | vendor cache |
| nginx immutable `/assets/` + SPA fallback | §Build & deploy | cache + deep-link refresh |
| iOS viewport setup (`domSetup`, `--real-vh`) | 17 | keyboard "jump" |

| Avoid | Why |
| Exposing the whole `BettingManagerReturn` from the adapter hook | legacy interface; `useBettingSlot()`/`useBetting()` directly is cleaner. Take the policies (clamp, lock, gate) separately |
| Bridging every SDK event onto the event bus "just in case" | events nobody consumes; bridge only what the scene reads (16) |
| Wiring Reload to `relaunchDemo()` | real-money → demo; use `window.location.reload()` (15) |
| One history hook instance per consumer + syncing them over bus events | one context is enough |
| A local copy of the SDK's `platform.ts` | `@krash/sdk` already exports it |
| Local hooks named like SDK hooks (`useGameHistory`, `useConnectionStatus`) | ambiguous imports (§Hook naming) |
| `Max` button with balance 0, `×N` without a `minBet` floor | invalid amounts; clamp to `[minBet, min(maxBet, balance)]` |
| Overwriting the bet input with `defaultBet` on every load | overwrites the user's edit; seed once per `configUpdatedAt` |
| `isWin = totalWin >= 0` | a zero win is a loss; use `> 0` |

## Panels index

| # | Chapter | Main building blocks (reference implementation) |
| 01 | Loader & launch | `MainLoader`, `SdkEventBridge`, `LaunchErrorScreen` |
| 02 | Header & balance | `Header`, `BalanceDisplay`, `GameHeader` |
| 03 | Multiplier & countdown | `MultiplierDisplay`, `Loader`, `useTick` |
| 04 | Multiplier history strip | `MultiplierHistory`, `MultiplierPill` |
| 05 | Betting panel | `BettingPanel`, `PlaceBet`, `useBettingManagerSDK` |
| 06 | Bet button | `BetButton`, `CashoutGuardedBetButton` |
| 07 | Autoplay panel | `AutoPlay/*`, `BetSlipPopups` |
| 08 | Double slot | `GameContent`, `useBetLayout` |
| 09 | Freebet | `FreeBet/*`, `FreeBetBonus`, `FreeBetModalTrigger` |
| 10 | My bets | `MyBets`, `RoundItem` |
| 11 | Live bets feed | `BettingHistory`, `useBettingHistory` |
| 12 | Statistics | `Statistic`, `MultiplierGrid`, `StatisticsChart`, `RoundsSelector` |
| 13 | Round info & provably fair | `RoundInfoContent`, `ProvablyFairContent`, `infoContent.ts` |
| 14 | Settings, sound, animation | `SettingsPanel`, `useSoundManager`, `useSoundEffects` |
| 15 | Connection & network | connection-status hook (skin-local), `ConnectionLostOverlay`, `NetworkStatus` |
| 16 | Phaser / EventBus bridge | `SdkEventBridge`, `game/*`, `PhaserGame` |
| 17 | Mobile popups & keyboard | `NavigationContext`, `MobilePopup`, `Popup`, `CustomKeyboard` |

