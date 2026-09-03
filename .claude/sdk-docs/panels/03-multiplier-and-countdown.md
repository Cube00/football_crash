<!-- source: https://krash-sdk-docs.playcore.live/en/panels/03-multiplier-and-countdown/ -->

# 03. Multiplier Display and Pre-round Countdown

The central zone of the screen: in `BETTING_OPEN` — a "Next round starts in X.XXs" countdown with a progress bar, in `FLYING` — the rising multiplier `1.87x`, in `CRASHED` — the same number in red (crash) style. In `BETTING_CLOSING` nothing is shown. On desktop it sits on top of the canvas, on mobile — in the upper part, with separate CSS classes. When animation is turned off (settings → animation off) the Phaser canvas is hidden and static images + a CSS background appear.

## What it shows

- Countdown (`BETTING_OPEN`): "Next round" title, progress bar (100 % → 0 %), remaining seconds with two decimals
- Multiplier (`FLYING` / `CRASHED`): `<multiplier>.toFixed(2) + 'x'`, crash class on `CRASHED`
- Animation-off fallback: idle image (every phase except `CRASHED`) / loss image (`CRASHED`), `app__loss-bg` on body
- Frozen: `app--frozen` class on the root (CSS only)

## SDK sources

| Data | Source | Type | Note |
| phase | `usePhase()` | `GamePhase` | store slice `phase`; changes only when the tick's `phase` field changes (`GameEngine.ts:77-91`) |
| multiplier (React) | `useMultiplier()` | `number` | store slice `multiplier`; updated **only** on `FLYING` ticks (`GameEngine.ts:115-117`) and on phase transitions; `1` on `BETTING_OPEN` (`:105-112`) |
| multiplier (event) | `client.on('tick')` | `TickPayload = { multiplier, phase, roundId, remainingMs, fairnessHash?, serverSeed? }` | arrives in every phase; `remainingMs` is **only** in the event — it is not written to the store |
| synchronous access | `GameEngine.latestMultiplier` (static) | `number` | the SDK itself writes it on every tick (`GameEngine.ts:74`); for autoplay callbacks |
| crash value | `useCrashedAt()` | `number \| null` | `tick.multiplier` on the first `CRASHED` tick (`GameEngine.ts:94`); `null` on `BETTING_OPEN` |
| crash event | `client.on('crash')` | `{ multiplier }` | once, on the transition to `CRASHED` (`:95`) |
| phase change | `client.on('phase-change')` | `{ phase: GamePhase; roundId: string }` | once per transition |
| frozen | `useIsGameFrozen()` / `client.on('game-frozen')` | `boolean` / `{ frozen }` | 2000 ms without a tick (`GameEngine.ts:15`); the timer starts after the first tick (`FreezeDetector.ts:19-25`) |

There is **no** client-side interpolation — both the SDK and the reference implementation show the server's raw ticks. The tick rate is the server's (~100 ms in `FLYING`, `events.ts:20`).

## Actions → SDK

This panel has no actions — it is a read-only display. The animation toggle lives in settings (14-settings-sound-animation); here only its result (`nav.animationEnabled` — `nav` is the app's own settings/popup state) is used.

## States and edge cases

| Phase | The reference implementation shows | crash flag |
| `BETTING_OPEN` | `<Loader>` countdown | — |
| `BETTING_CLOSING` | nothing (`''`) | — |
| `FLYING` | `<MultiplierDisplay>` — `tick` | false |
| `CRASHED` | `<MultiplierDisplay>` — last tick → `styles.crashed` + `app__tick__crash` | true |

- **Countdown drift**: if the server's `remainingMs` and the client's rAF-computed remaining time differ by > 500 ms — resync. On smaller drift the client keeps going on its own so the number doesn't "jump".
- **Countdown reset**: on the `BETTING_OPEN` `phase-change`, `totalDuration = 0`, the next tick bootstraps. A tick with `remainingMs <= 0` is ignored.
- **Reconnect mid-round**: the first tick brings the correct phase directly — `usePhase` switches, while `useMultiplier` only updates in `FLYING`. On reconnect in `CRASHED`, `useCrashedAt` is filled correctly (phase transition `BETTING_OPEN`(default)→`CRASHED`).
- **Frozen**: `useIsGameFrozen()` → the reference implementation only adds the `app--frozen` CSS class; the number stays at the last value. Disabling the buttons is already built into the SDK's `buttonVariant` (`buttonVariant.ts:31-36`).
- **Animation off**: `PhaserGameWrapper` sets the canvas to `opacity: 0` (does not unmount), `GameContent` adds the static images, `AppShell` — `app__background` and `app__loss-bg` on `CRASHED`. On mobile additionally `app__gradient-bottom--loss`.
- **Autoplay / freebet**: not relevant to this panel.

## Reference implementation

Structure: - `GameContent` — phase switch, animation-off images - `MultiplierDisplay` — the number + crash class - `useTick` — an app hook: EventBus `sfs:tick`/`sfs:phase-change` → `{ tick, crash, currentMultiplier, remainingMs }`; writes `GameEngine.latestMultiplier` - `Loader` — countdown, rAF + direct DOM, drift resync - `AppShell` — frozen / loss / background classes - `PhaserGameWrapper` — canvas opacity on the animation toggle - `SdkEventBridge` — `client.on('tick')` → `EventBus.emit('sfs:tick')`, `phase-change` → `sfs:phase-change` (`EventBus` — the app's local `Phaser.Events.EventEmitter`)

### Why EventBus and not `useMultiplier()`

The reference implementation does **not** use `useMultiplier()` — `useTick` listens to the EventBus directly (the reason: "Avoids extra latency from SDK store → useSyncExternalStore path"). Both paths are valid:

| Option | When | Cost |
| `useMultiplier()` (React hook) | showing a single number in the DOM; a simple skin | `useSyncExternalStore` re-render on every tick for the component that calls the hook — fine for an isolated small component |
| `client.on('tick')` (event) | canvas/Phaser/WebGL, direct DOM write, `remainingMs` (not in the store), synchronous access | no React state; you have to handle cleanup and phase reset yourself |

The reference `Loader` uses the second path **entirely** — no `useState`, no `useTick`: the rAF loop writes `textContent` and `style.width` directly, 0 re-renders for the duration of the countdown.

Reference implementation — `useTick` (trimmed):
```
const handleTick = (payload: { multiplier: number; phase: string; remainingMs: number }) => {
  GameEngine.latestMultiplier = payload.multiplier;
  setState(prev => ({
    ...prev,
    tick: payload.multiplier.toFixed(2),
    currentMultiplier: payload.multiplier,
    remainingMs: payload.remainingMs,
  }));
};

const handlePhaseChange = (payload: { phase: string }) => {
  if (payload.phase === 'CRASHED') {
    setState(prev => ({ ...prev, crash: true }));
  } else if (payload.phase === 'BETTING_OPEN') {
    GameEngine.latestMultiplier = 1.0;
    setState(prev => ({ ...prev, crash: false, tick: '1.00', currentMultiplier: 1.0 }));
  } else {
    setState(prev => ({ ...prev, crash: false }));
  }
};

EventBus.on('sfs:tick', handleTick);
EventBus.on('sfs:phase-change', handlePhaseChange);

```

The countdown (trimmed):
```
const tick = useCallback(() => {
  const elapsed = Date.now() - startTimeRef.current;
  const remaining = Math.max(totalDurationRef.current - elapsed, 0);
  const progress = totalDurationRef.current > 0 ? (remaining / totalDurationRef.current) * 100 : 0;
  if (fillRef.current) fillRef.current.style.width = `${progress}%`;          // direct DOM
  if (timeRef.current) {
    const seconds = remaining > 0 ? (remaining / 1000).toFixed(2) : '0.00';
    timeRef.current.textContent = startsInTemplate.current.replace('__TIME__', seconds);
  }
  if (remaining <= 0) { onCompleteRef.current?.(); return; }
  rafRef.current = requestAnimationFrame(tick);
}, []);

const handleTick = (payload: { remainingMs: number; phase: string }) => {
  const serverMs = payload.remainingMs;
  if (serverMs <= 0) return;
  if (totalDurationRef.current === 0) {               // first tick in this round — bootstrap
    totalDurationRef.current = serverMs;
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    return;
  }
  const clientRemaining = totalDurationRef.current - (Date.now() - startTimeRef.current);
  if (Math.abs(clientRemaining - serverMs) > 500) {   // drift > 500ms → resync
    totalDurationRef.current = serverMs;
    startTimeRef.current = Date.now();
  }
};

```

Root classes (`useNavigation` — the app's settings/popup state):
```
const phase = usePhase();
const isGameFrozen = useIsGameFrozen();
const { animationEnabled } = useNavigation();

<div className={`app ${isMobile ? 'app--mobile' : 'app--desk'} ${!animationEnabled ? 'app__background' : ''} ${!animationEnabled && phase === GamePhase.CRASHED ? 'app__loss-bg' : ''} ${isGameFrozen ? 'app--frozen' : ''}`}>

```

**The SDK does:** the `phase`/`multiplier`/`crashedAt`/`isGameFrozen` slices, the `tick` event with `remainingMs`, writing `GameEngine.latestMultiplier`, freeze detection. **UI policy (skin responsibility):** the EventBus bridge, `useTick`'s `crash` flag (does not use `useCrashedAt`), empty zone on `BETTING_CLOSING`, the 500 ms drift threshold, direct DOM countdown, animation-off images, re-writing `GameEngine.latestMultiplier` in `useTick` (the SDK already writes it — redundant, you will not need it in your own skin).

## Minimal example (React + Vite)

For the DOM number — hooks; for the countdown — `client.on('tick')` and a direct DOM write (like the reference implementation), because `remainingMs` is not in the store.
```
import { useEffect, useRef } from 'react';
import { useKrashClient, useMultiplier, usePhase, useCrashedAt, GamePhase } from '@krash/react';

function Countdown() {
  const client = useKrashClient();
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let total = 0, startedAt = 0, raf = 0;
    const frame = () => {
      const remaining = Math.max(total - (performance.now() - startedAt), 0);
      if (timeRef.current) timeRef.current.textContent = (remaining / 1000).toFixed(2);
      if (remaining > 0) raf = requestAnimationFrame(frame);
    };
    const off = client.on('tick', ({ phase, remainingMs }) => {
      if (phase !== 'BETTING_OPEN' || remainingMs <= 0) return;
      const clientRemaining = total - (performance.now() - startedAt);
      if (total === 0 || Math.abs(clientRemaining - remainingMs) > 500) {
        total = remainingMs; startedAt = performance.now();
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      }
    });
    return () => { off(); cancelAnimationFrame(raf); };
  }, [client]);

  return <div className="countdown">Next round in <span ref={timeRef}>0.00</span>s</div>;
}

function Multiplier() {
  const multiplier = useMultiplier();   // re-render on every FLYING tick — that is why it is a separate component
  const crashedAt = useCrashedAt();
  const crashed = crashedAt !== null;
  return (
    <div className={crashed ? 'mult mult--crashed' : 'mult'}>
      {(crashed ? crashedAt : multiplier).toFixed(2)}x
    </div>
  );
}

export function GameCenter() {
  const phase = usePhase();
  switch (phase) {
    case GamePhase.BETTING_OPEN:    return <Countdown />;
    case GamePhase.BETTING_CLOSING: return null;
    default:                        return <Multiplier />;   // FLYING, CRASHED
  }
}

```

`Countdown` unmounts on leaving `BETTING_OPEN`, so it needs no separate phase reset — every mount is a new round.

## Common mistakes

- Calling `useMultiplier()` in a large layout component — the whole subtree re-renders every ~100 ms. Put the number in a minimal leaf component.
- Looking for `remainingMs` in the store / in `useMultiplier` — it is only in the `tick` event.
- `setState` in the countdown on every rAF frame — 60 re-renders/s. Do it with a direct DOM write or with a ref, without `useSyncExternalStore`.
- Adding client-side interpolation to the multiplier — you will overshoot the server's crash value; the cashout number will be misleading.
- Detecting `CRASHED` by the `multiplier` stopping — use `usePhase()` or `useCrashedAt() !== null`.
- Hiding the UI on frozen — `isGameFrozen` may return to false within 2 s; a visual hint only (and the SDK has already disabled the buttons).

