<!-- source: https://krash-sdk-docs.playcore.live/en/panels/17-mobile-popups-and-keyboard/ -->

# 17. Mobile layout, popups and keyboard

On mobile the reference implementation has no sidebar — every panel is a full-screen popup, managed by a single `NavigationContext` (the app's own popup/sidebar state; `nav` in this chapter). The same context holds the state of the desktop sidebar (`SidebarArea`) and of the info popup (`InfoPopupTypes`). Bet amount entry on mobile is a `readOnly` input + a custom `CustomKeyboard` (portal into `document.body`), the orientation is locked to portrait with an overlay, and the device type comes from `@krash/react`'s `DeviceProvider`. This chapter describes every navigation value — an example navigation state — and which component renders it.

## What it shows

- Mobile popups: Settings (Menu), Multiplier history (players list), Statistics, My Bets, Free Bet, Auto Play, Rules, Limits, Provably Fair, How to Play, Points Details.
- Desktop info popups: Rules, Limits, Provably Fair, How to Play, Points Details, Free Bet Bonus (credited), Free Bet Completed — **on mobile too** (freebet modals).
- Custom keyboard: title, `min – max` subtitle, value with caret, 0–9, `.`, backspace, bottom buttons (`OK`/`BET` or `RESET`/`OK`).
- Orientation lock overlay: a "rotate your phone" card in landscape.
- On mobile both slots are always visible (`mode={BetLayout.Double}`); the `betFailed` banner is above both slots.

## SDK sources

| Data | Source | Type | Note |
| `isMobile`, `isDesktop`, `platform`, `setPlatform` | `useDevice()` | `Platform.Mob \| Platform.Desk` | `packages/react/src/contexts/DeviceContext.tsx:10-15, 103-109` |
| Platform detect | `detectPlatform()` (`@krash/sdk`) | `'desktop' \| 'mobile'` | UA regex **or** `(pointer: coarse)` **or** `innerWidth < 700` → mobile (`packages/sdk/src/launch/platform.ts:11-12, 34-52`) |
| URL hint | `?platform=` or `?device=` (`mobile\|mob\|m\|0`, `desktop\|desk\|d\|1`) | — | **only a hint**: if it contradicts the runtime detect, runtime wins (`DeviceContext.tsx:44-48`); the URL is rewritten to the canonical `platform=`, `device` is removed (`:72-86`) |
| `GameConfig` for the info texts | `useGameConfigContext().config` | `GameConfig` | 13 |
| Freebet modal data | `useFreerounds()` | `UseFreeroundsReturn` | the freebet modals read directly from this hook |

The SDK has **no** popup/navigation state — only device detection and `useMediaQuery`.

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Side-menu button (mobile) | `nav.handleSidebarAreaClick(area)` → `Popups.*` toggle | on `MyBets` `EventBus.emit('cmd:get-my-history', {limit:50, offset:0})` → `client.getMyHistory(50, 0)` (`EventBus` — the app's local `Phaser.Events.EventEmitter`, 16) |
| Close popup | `nav.setActivePopup(null)` | — |
| Info link (mobile) | `nav.handleMobileInfoClick(Popups.X)` | — |
| Keyboard `BET` | `PlaceBet.onConfirmBet(amount)` → `BettingPanel.handleBetClick` → `onBet(amount)` | `placeBet(amount, {autoCashoutAt})` (05) |
| Keyboard `OK` / overlay / Esc | `onClose` → apply the amount (clamp `[min, max]`, 2 decimals) | `setBetAmount(amount)` |
| Auto-cashout keyboard `OK` | the same `PlaceBet` with `suffix='x'`, `onConfirmBet` is not passed → `RESET`/`OK` | `updateConfig({autoCashOut})` |

## States and edge cases

### Map of navigation values

Below is an example navigation state — the enums are the app's own, the SDK does not have them. `SidebarArea` → mobile `Popups`:

| `SidebarArea` | desktop (`sidebarAreaContent`) | mobile → `Popups` |
| `BettingHistory` (default) | `<BettingHistory />` | `MULTIPLIER_HISTORY` |
| `Statistics` | `<Statistic />` | `STATISTICS` |
| `MyBets` | `<MyBets />` | `MY_BETS` (+ `cmd:get-my-history`) |
| `FreeBet` | `<FreeBet isMobile={false} />` | `FREE_BET` |

`Popups` → component:

| `Popups` | Value | Title (i18n key) | Component |
| `SETTINGS` | `'SETTINGS'` | `popups.menu` | `SettingsPanel isMobile` |
| `MULTIPLIER_HISTORY` | `'MULTIPLIER_HISTORY'` | `sideMenu.viewUsers` | `BettingHistory isMobile` |
| `STATISTICS` | `'STATISTICS'` | (empty — `TabSwitcher` in the header) | `MultiplierGrid content={nav.activePopupTab}` |
| `MY_BETS` | `'MY_BETS'` | `tabs.myBets` | `MyBets` |
| `FREE_BET` | `'FREE_BET'` | `tabs.freeBet` | `FreeBet isMobile` |
| `AUTO_PLAY` | `'AUTO_PLAY'` | `'Auto Play'` (hardcoded) | `AutoPlayContent` — **on desktop too** with the same `Popup`, one per slot |
| `RULES` | `'Rules'` | `settings.rules` | `InfoSection getRulesSections` |
| `LIMITS` | `'Limits'` | `settings.limits` | `InfoSection getLimitsSections` |
| `PROVABLY_FAIR` | `'Provably Fair'` | `settings.provablyFair` | `ProvablyFairContent` |
| `HOW_TO_PLAY` | `'How to Play'` | `settings.howToPlay` | `HowToPlayContent` |
| `POINTS_DETAILS` | `'Points Details'` | `popups.pointsDetails` | `RoundInfoContent` (if `selectedRoundItem`) |

`InfoPopupTypes` → component (the info popup is mounted on **both** platforms):

| `InfoPopupTypes` | Value | Component |
| `POINTS_DETAILS` | `'Points Details'` | `RoundInfoContent` |
| `RULES` | `'Rules'` | `InfoSection` |
| `LIMITS` | `'Limits'` | `InfoSection` |
| `PROVABLY_FAIR` | `'Provably Fair'` | `ProvablyFairContent` |
| `HOW_TO_PLAY` | `'How to Play'` | `HowToPlayContent` |
| `FREE_BET_BONUS` | `'Free Bet Bonus'` | `FreeBetBonus variant='credited'` |
| `FREE_BET_COMPLETED` | `'Free Bet Completed'` | `FreeBetBonus variant='completed'` (`acknowledgeCompleted()` on close) |

`NavigationReturn`: `sidebarAreaContent`, `activePopup`, `infoPopupType`, `activePopupTab` (`StatisticsTab`), `animationEnabled`, `handleSidebarAreaClick`, `handleFreeBetClick`, `handleInfoPopupClick` (on mobile sets `activePopup` to null), `handleMobileInfoClick`, `handleAnimationChange`.

### Popup chromes

|  | `Popup` (mobile + AutoPlay) | `InfoPopup` (desktop info + freebet modals) | `CustomKeyboard` |
| Esc | ✓ | ✓ | ✓ |
| Overlay click | closes only on the backdrop | **any** click on the wrapper closes it, container `stopPropagation` | on the backdrop |
| Scroll lock | `body.overflow = hidden` | ✗ | `body.overflow = hidden` |
| Close button sound | `smallButtonClick` | `smallButtonClick` | ✗ |
| `role=dialog aria-modal` | ✓ | ✓ | ✗ |
| Portal | ✗ | ✗ | ✓ `createPortal(..., document.body)` |

- **Two popups at once** — `activePopup` and `infoPopupType` are independent: on mobile the freebet modal trigger can open `FREE_BET_BONUS` on top of `Popups.SETTINGS`. `handleInfoPopupClick` avoids this on mobile with `setActivePopup(null)` — do the same on every path that opens an info popup.
- **Body scroll** — if the app's base style already sets `overflow: hidden` on `body`, a popup cleanup that restores `''` in fact removes the overflow (see Common mistakes).
- **Orientation** — `OrientationLockOverlay` on `isMobile && matchMedia('(orientation: landscape)')`; **rendered at the very top of the tree**, even before the loader. The game is not blocked in landscape — only covered by the overlay.
- **iOS Safari** — the DOM setup module: `--real-vh` CSS variable (`innerHeight`), updated on resize; `scrollTo(0,0)` on `focusout`/`resize` after the keyboard closes.
- **Native keyboard** — `inputMode='none'` + `readOnly` on mobile, so the browser keyboard does not open; `onClick` → `CustomKeyboard`.
- **Keyboard value** — empty on every open; `.` in the first position → `0.`; max 2 decimals; `NaN` on close → the amount does not change.
- **Wake lock** — `useWakeLock` keeps the screen awake; again on visible.
- **Reconnect / frozen** — popups stay open; `MY_BETS` repeats `cmd:get-my-history` 1 s after BETTING_OPEN and on cashout/crash, if open.
- **Freebet** — the `AUTO_PLAY` popup receives `isFreeBet`; the `FREE_BET` popup gets the `FreeBet` component (09).

## Reference implementation

Building blocks:

- `NavigationContext` — unified navigation state + MyBets refresh effect (`useNavigation` re-export).
- `MobilePopup` — `Popups` → content, inside the `Popup` chrome.
- `Popup` — full-screen popup chrome, the STATISTICS tab header.
- `InfoPopup` — desktop info/modal chrome.
- `DesktopInfoPopup` — `InfoPopupTypes` → content, freebet credited/completed logic.
- `BetSlipPopups` — AutoPlay popup per slot (`betting.activeAutoPlaySlot/Popup`).
- `CustomKeyboard` — portal keyboard.
- `PlaceBet` — input + keyboard wiring.
- `OrientationLockOverlay` — portrait lock.
- DOM setup module — overscroll, `--real-vh`, iOS scroll reset, `preloadSounds()`.
- utils — `getPopupTitle`, `getInfoPopupTitle`, `getActiveSideMenuContent`.
- enums — `Popups`, `SidebarArea`, `InfoPopupTypes`, `StatisticsTab`, `NetworkStatusState`; `Platform` re-exported from the SDK.

Reference implementation — sidebar → popup mapping:
```
const handleSidebarAreaClick = useCallback(
  (content: SidebarArea | null) => {
    if (isMobile) {
      let targetPopup: Popups | null = null;
      switch (content) {
        case SidebarArea.BettingHistory: targetPopup = Popups.MULTIPLIER_HISTORY; break;
        case SidebarArea.Statistics:     targetPopup = Popups.STATISTICS; break;
        case SidebarArea.MyBets:
          EventBus.emit('cmd:get-my-history', { limit: 50, offset: 0 });
          targetPopup = Popups.MY_BETS;
          break;
        case SidebarArea.FreeBet:        targetPopup = Popups.FREE_BET; break;
        default:                         targetPopup = null;
      }
      setActivePopup(prev => (prev === targetPopup ? null : targetPopup));
    } else {
      if (content === SidebarArea.MyBets) {
        EventBus.emit('cmd:get-my-history', { limit: 50, offset: 0 });
      }
      setSidebarAreaContent(prev => (prev === content ? null : content));
    }
  },
  [isMobile]
);

```

Reference implementation — keyboard wiring in the amount input:
```
const handleInputClick = (e: React.MouseEvent) => {
  if (isMobile && !disabled) {
    e.preventDefault();
    setKeyboardValue('');
    setIsKeyboardOpen(true);
  }
};

const handleKeyboardConfirm = () => {
  setIsKeyboardOpen(false);
  const amount = parseKeyboardValue(keyboardValue);
  if (amount !== null) {
    applyAmount(amount);
    onConfirmBet?.(amount);
  } else {
    onConfirmBet?.();
  }
};

<CustomKeyboard
  isOpen={isKeyboardOpen}
  value={keyboardValue}
  onValueChange={setKeyboardValue}
  onClose={handleKeyboardClose}
  onConfirm={onConfirmBet ? handleKeyboardConfirm : undefined}
  min={minValue}
  max={maxValue}
  title={resolvedKeyboardTitle}
/>

```

`onConfirm` present → the buttons are `OK` (close, apply the amount) + `BET` (apply + bet); absent (auto-cashout) → `RESET` (= `min`) + `OK`.

Device detect — SDK, `packages/sdk/src/launch/platform.ts:34-52`:
```
export function detectPlatform(): 'desktop' | 'mobile' {
  if (typeof globalThis === 'undefined' || typeof globalThis.window === 'undefined') {
    return 'desktop';
  }
  const win = globalThis.window;
  const ua = globalThis.navigator?.userAgent ?? '';
  const isUaMobile = MOBILE_UA_REGEX.test(ua);
  const hasCoarsePointer =
    typeof win.matchMedia === 'function' &&
    win.matchMedia('(pointer: coarse)').matches;
  const width = win.innerWidth;
  const isSmallViewport = width > 0 && width < MOBILE_VIEWPORT_MAX_WIDTH;
  return isUaMobile || hasCoarsePointer || isSmallViewport ? 'mobile' : 'desktop';
}

```

**UI policy (skin responsibility) vs SDK:** the enums, the popup chromes, the keyboard, the orientation lock, `--real-vh`, showing both slots on mobile — skin. SDK: `DeviceProvider`/`useDevice`, `detectPlatform`, `useMediaQuery`, the `Platform` enum.

## Minimal example (React + Vite)

```
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDevice, useMediaQuery } from '@krash/react';

type Panel = 'settings' | 'history' | 'stats' | null;

export function MobileShell() {
  const { isMobile } = useDevice();
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // body scroll lock while a popup is open
  useEffect(() => {
    document.body.style.overflow = panel ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [panel]);

  return (
    <>
      {isMobile && isLandscape && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', color: '#fff', display: 'grid', placeItems: 'center' }}>
          Please rotate your device to portrait
        </div>
      )}
      <nav>
        <button onClick={() => setPanel(p => (p === 'history' ? null : 'history'))}>Players</button>
        <button onClick={() => setPanel(p => (p === 'stats' ? null : 'stats'))}>Stats</button>
        <button onClick={() => setPanel(p => (p === 'settings' ? null : 'settings'))}>Menu</button>
      </nav>
      {panel && (isMobile ? (
        <FullscreenPopup onClose={() => setPanel(null)}>{panel}</FullscreenPopup>
      ) : (
        <aside>{panel}</aside>
      ))}
    </>
  );
}

function FullscreenPopup({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', height: 'var(--real-vh, 100vh)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111', color: '#fff', minHeight: '100%' }}>
        <button onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

```

Setting `--real-vh`: `document.documentElement.style.setProperty('--real-vh', window.innerHeight + 'px')` on `resize`.

## Common mistakes

- **Blindly trusting `?platform=desktop`** — the SDK's runtime detect overrides the URL hint; if your layout does not use `isMobile`, a mobile user gets the desktop UI.
- **`useMediaQuery` on the first render** — returns `false`; the orientation overlay may "flicker". The reference implementation reads `matchMedia` directly in the initial state.
- **Native keyboard + fixed layout** — on iOS the keyboard changes the viewport; use `readOnly` + a custom keyboard or `--real-vh`.
- **Freebet modal only on desktop** — despite its name, `DesktopInfoPopup` must be mounted on mobile too, otherwise the credited/completed modals will not appear.
- **Popup scroll lock cleanup** — `body.overflow = ''` cancels the app's global `hidden`; set your own base style in CSS, not inline.

