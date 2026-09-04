<!-- source: https://krash-sdk-docs.playcore.live/en/panels/02-header-and-balance/ -->

# 02. Header and Balance Display

The header is the top bar: logo on the left (in demo — a relaunch button), balance and action buttons on the right. On desktop the actions are the settings popover, fullscreen and close; on mobile — the burger menu (settings popup) and close. The balance display is the same component on both platforms, with an animated number and a jump to the cashier on click.

## What it shows

- logo (`/assets/logo.png`); in demo mode — the "New Demo Session" button
- balance: label + `<value>.toFixed(minorUnits) <CURRENCY>` (e.g. `120.50 USD`), with a 1 s easeOut animation
- Desktop: Settings (popover trigger), Fullscreen toggle, Close game (only if `exitUrl` exists)
- Mobile: Menu (settings popup), Close game (only if `exitUrl` exists)
- Below the header — the crash history strip (see 04-multiplier-history-strip)

## SDK sources

| Data | Source | Type | Note |
| balance | `useBalance()` | `number` | store slice `balance`; re-render only on a balance change (`useBalance.ts:8-11`). Default `0` until `JoinCrashOk` arrives |
| balance update sources | SDK event `balance` | `{ balance: number }` | `JoinCrashOk` (`ConnectionManager.ts:415-417`), the `Balance` cmd (`:509-510`), the `balance` field of the `BetPlaced`/`CashoutDone`/`CancelBetOk` payload (`BettingEngine.ts:382-385, 679-681, 704-706`) |
| currency code | `useGameConfigContext().config.currencyCode`, fallback `useCurrency().currency` | `string` | reference implementation: `(config?.currencyCode \|\| globalCurrency).toUpperCase()`. `GameConfigProvider` default `'USD'` (`GameConfigContext.tsx:17-25`) and it is **inert** until the app calls `updateConfig` — the reference implementation does this in its betting adapter hook with the value of `useGameConfig()` |
| decimal places | `useGameConfigContext().config.currencyMinorUnits` | `number` | default `2` |
| demo mode | `useKrashState().isDemo` | `boolean` | `session.mode === 'demo'`, before the session — from the URL (`KrashProvider.tsx:131`) |
| demo relaunch | `useKrashState().relaunchDemo` | `() => Promise<void>` | new demo session + `client.launch()` (`KrashProvider.tsx:86-106`) |
| `exitUrl` / `lobbyUrl` | `useKrashState().exitUrl`, `.lobbyUrl` | `string \| null` | URL query `exitUrl`, `lobbyUrl` (`LaunchService.ts:44-45`) |
| `session.gameId` | `useKrashState().session?.gameId` | `string \| undefined` | if you need it (e.g. a per-game logo). In the snippet below the fallback `'kings_move'` is the SDK's legacy default — always pass your own `gameId` |
| mobile/desktop | `useDevice().isMobile` | `boolean` | viewport `< 700` (`platform.ts:11`) + URL hint |

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| click on the balance | `openCashier()` → `window.parent.postMessage('openCashier', '*')` | does not touch the SDK; the parent iframe (the operator's lobby) catches the message |
| click on the demo logo | `relaunchDemo()` | `launchService.launchDemo(gameId, lang, platform, currency)` → new `LaunchSession` → `client.launch()` again (new SFS connect) |
| Fullscreen | `document.documentElement.requestFullscreen()` / `exitFullscreen()` | does not touch the SDK; the Phaser wrapper should call `scale.refresh()` on `fullscreenchange` |
| Close game | `window.parent.location.href = exitUrl` (catch → `window.location.href`) | does not touch the SDK; only after `isSafeRedirectUrl(exitUrl)` |
| Settings (desktop) | local `showSettings` toggle + click-outside | UI-only; the settings themselves — 14-settings-sound-animation |
| Menu (mobile) | `nav.setActivePopup(Popups.SETTINGS)` — `nav` is the app's own popup/sidebar state (`NavigationContext`) | UI-only |

## States and edge cases

- **Balance before launch**: `0`. The reference implementation is behind the loader at this time, so "0.00" is not visible; if your loader is on `launchStatus`, `balance` has already arrived by the moment of `ready` (`JoinCrashOk` goes through before `launch()` resolves).
- **Balance decreasing on a bet and increasing on cashout at the same time**: the reference animation "re-aims" — it moves from the currently displayed value to the new target without restarting the loop (see the snippet below). The increase is not lost because of a race between two targets.
- **Free bet mode**: the wallet balance **does not change** on a free bet — the header still shows the wallet. The free bet balance is in a separate panel (see 11-freerounds).
- **Multi-currency (`currencyMode: 'multi'`)**: the header's currency is still the player's (`gameConfig.currencyCode`); `currencyMode` only concerns rendering other players' bet feed.
- **No `exitUrl`**: the close button is not rendered at all.
- **`exitUrl` is unsafe** (`javascript:` etc.): the button is visible, on click only an error log.
- **Reconnect**: the balance arrives again on `JoinCrashOk` — the header needs nothing.
- **Frozen / autoplay / phase**: does not affect the header; it has no disabled state.
- **Demo**: the logo is a button; in real-money — a plain `<img>`.

## Reference implementation

Structure: - `GameHeader` — reading the SDK hooks and wiring `Header` + `MultiplierHistory` together - `Header` — layout, fullscreen, close, settings popover (desktop) / menu (mobile) - `BalanceDisplay` — currency, decimals, rAF animation, cashier click - `SettingsPanel` — the popover's contents (only the trigger in this chapter) - `openCashier`, `isSafeRedirectUrl` — helpers

Reference implementation — all SDK sources in one place (`nav` — the app's own popup state; `'kings_move'` is the SDK's legacy default `gameId` — always pass your own):
```
const { isMobile } = useDevice();
const balance = useBalance();
const { session, isDemo, relaunchDemo, lobbyUrl, exitUrl } = useKrashState();

<Header
  gameId={session?.gameId || 'kings_move'}
  balance={balance}
  onMenu={() => nav.setActivePopup(Popups.SETTINGS)}
  isDemo={isDemo}
  onDemoRelaunch={relaunchDemo}
  lobbyUrl={lobbyUrl}
  exitUrl={exitUrl}
/>

```

Reference implementation — currency and format:
```
const { config } = useGameConfig();            // useGameConfigContext
const { currency: globalCurrency } = useCurrency();
const effectiveCurrency = (config?.currencyCode || globalCurrency).toUpperCase();
const decimals = config?.currencyMinorUnits || 2;

const animatedBalance = useAnimatedBalance(balance);
const formattedBalance = animatedBalance.toFixed(decimals) + ' ' + effectiveCurrency;

return (
  <div className={cn(styles.balanceDisplay, className)} onClick={openCashier}>
    <p className={styles.balanceDisplay__label}>{t('betting.balance')}</p>
    <p className={styles.balanceDisplay__value}>{formattedBalance}</p>
  </div>
);

```

The animation (trimmed): a single `stateRef` (`current/from/to/startTime/rafId`); on a new target `from = current`, `to = target`, if the loop is already running — it is not restarted:
```
const ANIMATION_DURATION = 1000;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

useEffect(() => {
  const s = stateRef.current;
  if (target === s.to && s.current === target) return;
  s.from = s.current; s.to = target; s.startTime = 0;
  if (s.rafId !== 0) return; // the loop is already running — it will read the new from/to itself
  const tick = (timestamp: number) => {
    const a = stateRef.current;
    if (!a.startTime) a.startTime = timestamp;
    const progress = Math.min((timestamp - a.startTime) / ANIMATION_DURATION, 1);
    const next = a.from + (a.to - a.from) * easeOut(progress);
    a.current = next; setDisplayed(next);
    if (progress < 1) a.rafId = requestAnimationFrame(tick);
    else { a.current = a.to; a.from = a.to; a.rafId = 0; setDisplayed(a.to); }
  };
  s.rafId = requestAnimationFrame(tick);
}, [target]);

```

Fullscreen and close:
```
const handleToggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => logger.error('Error enabling fullscreen:', err));
  } else {
    document.exitFullscreen().catch(err => logger.error('Error exiting fullscreen:', err));
  }
};

const handleCloseGame = () => {
  if (exitUrl && isSafeRedirectUrl(exitUrl)) {
    try { window.parent.location.href = exitUrl; }
    catch { window.location.href = exitUrl; }
  } else if (exitUrl) {
    logger.error('[Security] Blocked unsafe exitUrl:', exitUrl);
  }
};

```

The desktop vs mobile branch: `!isMobile` → settings popover (`settingsRef` + `mousedown` click-outside), fullscreen, close; `isMobile` → `IconButton size={36}` menu → `onMenu`, close. The settings popover's trigger is `IconButton active={showSettings}`, its contents `SettingsPanel`.

**The SDK does:** the `balance` slice, `isDemo`, `relaunchDemo`, parsing `exitUrl`/`lobbyUrl`, `gameConfig.currencyCode`/`currencyMinorUnits`, syncing the `CurrencyProvider` currency (URL → session → `game-config`). **UI policy (skin responsibility):** the rAF animation and the 1 s duration, `postMessage('openCashier')`, the `parent.location` redirect + `isSafeRedirectUrl`, the fullscreen API, filling `GameConfigContext` from `useGameConfig()`, ignoring the `lobbyUrl`/`gameId` props.

## Minimal example (React + Vite)

Without `GameConfigProvider` — `useGameConfig()` (store slice) directly, and `session.currency` instead of the `useCurrency()` fallback.
```
import { useBalance, useGameConfig, useKrashState } from '@krash/react';

const isSafeUrl = (url: string) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

export function Header() {
  const balance = useBalance();
  const config = useGameConfig();                 // null until GAME_CONFIG arrives
  const { session, isDemo, relaunchDemo, exitUrl } = useKrashState();

  const currency = (config?.currencyCode ?? session?.currency ?? 'USD').toUpperCase();
  const decimals = config?.currencyMinorUnits ?? 2;

  const openCashier = () => window.parent.postMessage('openCashier', '*');
  const closeGame = () => {
    if (exitUrl && isSafeUrl(exitUrl)) window.parent.location.href = exitUrl;
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <header className="header">
      {isDemo
        ? <button className="logo" onClick={() => void relaunchDemo()} title="New demo session"><img src="/logo.png" alt="" /></button>
        : <img className="logo" src="/logo.png" alt="" />}

      <button className="balance" onClick={openCashier}>
        <span>Balance</span>
        <strong>{balance.toFixed(decimals)} {currency}</strong>
      </button>

      <button onClick={toggleFullscreen}>⛶</button>
      {exitUrl && <button onClick={closeGame}>✕</button>}
    </header>
  );
}

```

The balance animation is not required — `useBalance()` only re-renders on a real change. If you want an animation, take over the re-aim logic of the `useAnimatedBalance` snippet above; a plain cancel/restart has a race.

## Common mistakes

- Relying on `useGameConfigContext().config.currencyCode` without calling `updateConfig` — it will always return `'USD'`. Either do `updateConfig(useGameConfig())`, or read `useGameConfig()` directly.
- Calling `useKrashState()` at the top level of the header without memo — the context value is not memoised, every state change of the provider causes a re-render. Wrap the header components in `memo`.
- Hardcoding `toFixed(2)` for the balance — `currencyMinorUnits` may not be 2.
- Redirecting to `exitUrl` without checking the protocol.
- Calling `relaunchDemo` in a real-money session (e.g. on a "Reload" button) — the player is switched to demo. Show it only on `isDemo === true`; for a reload use `window.location.reload()`.
- Showing the close button without `exitUrl` — `globalThis.close()` does nothing inside an iframe.

