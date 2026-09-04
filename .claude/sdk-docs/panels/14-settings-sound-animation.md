<!-- source: https://krash-sdk-docs.playcore.live/en/panels/14-settings-sound-animation/ -->

# 14. Settings, sound and animation (Settings)

The Settings panel consists of three toggles (Sound, Music, Animation) and five links (Provably Fair, How to Play, Rules, Limits, Free Bet archive). On desktop it is the popover of the header's gear button (closes on click-outside); on mobile it is the `Popups.SETTINGS` full-screen popup, titled "Menu". The toggle values are stored in `@krash/react`'s `SettingsProvider`; playing sounds and turning off animation is skin code.

## What it shows

- `Sound` toggle → `settings.sound` — button clicks, cashout, crash, wait-loop.
- `Music` toggle → `settings.music` — background loop.
- `Animation` toggle → `settings.animation` — show/hide the Phaser canvas.
- Links: Provably Fair, How to Play, Rules, Limits (13), Free Bet (archive sidebar/popup).

## SDK sources

| Data | Source | Type | Note |
| `settings` | `useSettings().settings` | `GameSettings { sound, music, animation }` | default all `true` (`packages/react/src/contexts/SettingsContext.tsx:18-22`) |
| Persistence | `SettingsProvider` | localStorage `krash.settings:<sessionToken>` | `SettingsContext.tsx:24, 41-43`. Keys of other sessions and the legacy `krash.settings` are deleted on bind (`:92-112`) |
| URL override | `?extraParams={"sound":false,...}` (JSON) | `Partial<GameSettings>` | `SettingsContext.tsx:45-59`; always overrides the stored value (`:136`) |
| Writes before session | `updateSetting` / `toggleSetting` | — | state changes, but it is **not** written to localStorage until `session.sessionToken` exists (`:139-158`) |
| Phase/multiplier for sound | `client.on('tick')` | `TickPayload` | the reference implementation drives sounds only from tick |
| Cashout for sound | (reference implementation: from the handler) / `client.on('cashout-done')` | `CashoutDonePayload` | see Minimal example |

The SDK has **no sound or animation logic** — only the persistence of three booleans.

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| Toggle | `updateSetting('sound' \| 'music' \| 'animation', checked)` | localStorage write (if a session exists); nothing on the server |
| Animation toggle | same + `animationEnabled` sync in the app's own `NavigationContext` (popup/sidebar state) | — |
| Info links | `onInfoClick(InfoPopupTypes.X)` / `onMobileInfoClick(Popups.X)` | — |
| Free Bet | `nav.handleFreeBetClick()` → `SidebarArea.FreeBet` / `Popups.FREE_BET` | — |

## States and edge cases

**Sound rules** (the reference implementation's policy — a skin responsibility):

| `sound` | `music` | clicks / wait loop / scream | cashout | gong (`crashSound2`) | background music |
| on | on | ✓ | ✓ | ✓ | ✓ (FLYING, multiplier > 1) |
| on | off | ✓ | ✓ | ✓ | ✗ |
| off | on | ✗ | ✓ | ✓ | ✓ |
| off | off | ✗ | ✗ | ✗ | ✗ |

- `playSound`: `!sound && !music → return`; `music && !sound && type !== 'cashout' → return`.
- `useCrashSound`: gong if `sound || music`; `crashSound` (scream) only if `sound`.
- `useWaitPhaseSound`: only `sound`; on `sound=false` the loop stops.
- Background music: stops on `BETTING_OPEN`, starts in `FLYING` at `multiplier > 1.0`, stops on `CRASHED`.
- **Autoplay unlock** — the browser blocks sound until a user gesture. The reference implementation keeps permanent interaction listeners on `document` and queues sounds requested while locked.
- **Tab hidden** — music and the wait loop are paused, resumed on visible; no new sound is played while `isDocumentHidden()`.
- **Animation off** — Phaser is **not destroyed**: the canvas wrapper only sets `opacity: 0`, the game area shows static webp images (idle / loss), the shell adds a background class and, on CRASHED, a loss-background class. The GPU/CPU saving is minimal — if you want a real shutdown, unmount the canvas.
- **Reconnect / frozen** — no effect; sound follows tick, without tick nothing plays.
- **Freebet / autoplay** — no effect.

## Reference implementation

Building blocks:

- `SettingsPanel` — toggles + links; `onAnimationChange` effect.
- `Header` — desktop popover + click-outside.
- `MobilePopup` — `Popups.SETTINGS` → `SettingsPanel isMobile`.
- `NavigationContext` (the app's own popup/sidebar state) — `animationEnabled` ← `settings.animation`.
- `useSoundManager` — sound core: `SOUNDS`, `preloadSounds`, `useSound`, `useBackgroundMusic`, `useCrashSound`, `useWaitPhaseSound`.
- `useSoundEffects` — the only event-driven sound — `client.on('tick')`.
- `useWakeLock` — Screen Wake Lock (on mount, again on visible).
- DOM setup module — `preloadSounds()` on app import.
- `PhaserGameWrapper`, `GameContent`, `AppShell` — animation-off fallback.

Sound keys: `buttonClick`, `smallButtonClick`, `betCancelSwitch`, `cashout`, `backgroundMusic`, `crashSound`, `crashSound2`, `waitPhaseSound`.

Where click sounds are played (from handlers, not from events): `buttonClick` — bet; `cashout` — cashout; `betCancelSwitch` — cancel/stop autoplay (all three in the betting adapter hook's handlers); `smallButtonClick` — tabs, popup close, ±, rounds selector, etc.

Reference implementation — tick-driven sounds (`cbRef` holds the sound manager's callbacks):
```
useEffect(() => {
  return client.on('tick', (payload) => {
    const { phase, multiplier } = payload;

    if (multiplier > 1.0 && phase === GamePhase.FLYING) {
      cbRef.current.startMusic();
    }

    if (phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    if (phase === GamePhase.BETTING_OPEN) {
      cbRef.current.stopMusic();
      cbRef.current.stopWaitPhaseSound();
      cbRef.current.playWaitPhaseSound();
    } else if (phase === GamePhase.FLYING) {
      cbRef.current.stopWaitPhaseSound();
    } else if (phase === GamePhase.CRASHED) {
      cbRef.current.playCrashSound();
      cbRef.current.stopMusic();
      cbRef.current.stopWaitPhaseSound();
    }
  });
}, [client]);

```

Reference implementation — toggle handler:
```
const { settings, updateSetting } = useSettings();
// ...
const handleToggle = (settingId: keyof GameSettings, checked: boolean) => {
  updateSetting(settingId, checked);
};

```

**UI policy (skin responsibility) vs SDK:** the sound table, the unlock/queue mechanism, tick-based music, the "opacity 0 + webp" animation-off — skin. SDK: `SettingsProvider` (persistence, URL override), the `tick`/`phase-change`/`cashout-done` events.

## Minimal example (React + Vite)

A headless `SoundLayer` that listens to `phase-change` and `cashout-done` and is gated by `settings.sound`. The `Audio` objects are created once; if the browser blocks autoplay, the `play()` rejection is simply ignored.
```
import { useEffect, useRef } from 'react';
import { useKrashClient, useSettings, GamePhase } from '@krash/react';

const SRC = {
  crash: '/audio/crash.mp3',
  cashout: '/audio/cashout.mp3',
  wait: '/audio/wait-loop.mp3',
} as const;

export function SoundLayer() {
  const client = useKrashClient();
  const { settings } = useSettings();
  const soundRef = useRef(settings.sound);
  const audio = useRef<Record<keyof typeof SRC, HTMLAudioElement> | null>(null);

  useEffect(() => { soundRef.current = settings.sound; }, [settings.sound]);

  useEffect(() => {
    audio.current = {
      crash: new Audio(SRC.crash),
      cashout: new Audio(SRC.cashout),
      wait: Object.assign(new Audio(SRC.wait), { loop: true }),
    };
    return () => {
      if (audio.current) Object.values(audio.current).forEach(a => a.pause());
    };
  }, []);

  useEffect(() => {
    const play = (key: keyof typeof SRC) => {
      if (!soundRef.current || !audio.current) return;
      const a = audio.current[key];
      a.currentTime = 0;
      a.play().catch(() => { /* blocked until first user gesture */ });
    };
    const stop = (key: keyof typeof SRC) => { audio.current?.[key].pause(); };

    const offPhase = client.on('phase-change', ({ phase }) => {
      if (phase === GamePhase.BETTING_OPEN) play('wait');
      else stop('wait');
      if (phase === GamePhase.CRASHED) play('crash');
    });
    const offCashout = client.on('cashout-done', () => play('cashout'));
    return () => { offPhase(); offCashout(); };
  }, [client]);

  // when sound is turned off, the running loop must stop too
  useEffect(() => { if (!settings.sound) audio.current?.wait.pause(); }, [settings.sound]);

  return null;
}

export function SoundToggle() {
  const { settings, toggleSetting } = useSettings();
  return (
    <label>
      <input type="checkbox" checked={settings.sound} onChange={() => toggleSetting('sound')} /> Sound
    </label>
  );
}

```

## Common mistakes

- **Reading settings outside `KrashProvider`** — `SettingsProvider` waits for `sessionToken` from `KrashContext`; outside it persistence will never happen.
- **"Losing" a toggle before the session** — a value changed before launch lives only in state; when the session arrives, the stored/URL value overrides it (`SettingsContext.tsx:131-137`).
- **Ignoring the `?extraParams` override** — the operator may turn off sound from the launch URL; this always wins over the stored value.
- **Event-based click sound** — `bet-placed` is the server's ACK, 100+ ms after the click. Play the click sound from the handler, as the reference implementation does.
- **Interpreting `tick` instead of the `crash` event** — the SDK has separate `crash` and `phase-change` events; comparing tick's phase (the reference implementation's way) works, but `phase-change` is simpler.
- **Animation off = Phaser off** — in the reference implementation the canvas still draws; if you want to save battery, `game.destroy(true)` or conditional mount.

