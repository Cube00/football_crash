<!-- source: https://krash-sdk-docs.playcore.live/en/panels/16-phaser-eventbus-bridge/ -->

# 16. Canvas layer and the EventBus bridge (Phaser / Pixi / DOM)

The reference implementation's visual layer is Phaser 3 + Spine and does not take part in React's render cycle. Between the SDK and Phaser stands one headless component — `SdkEventBridge` (the app's own) — which re-emits `KrashClient`'s events onto the `EventBus` (the app's local `Phaser.Events.EventEmitter`) and, in the other direction, passes UI commands (`cmd:*`) to the SDK. This chapter describes which event goes where, who actually consumes it, and how to reproduce the same with any emitter (Pixi, mitt, DOM CustomEvent). Desktop and mobile are one and the same scene, with different camera framing.

## What it shows

- Spine background (`Background.skel`) and the main character (`levana saginashvili.skel`).
- Animation by phase: `Idle` (accepting bets), `Action` / `Action_2` alternating (FLYING), `Win` once + red gradient overlay (CRASHED).
- FPS: 30 in idle, 60 in FLYING/CRASHED.
- **The multiplier number is not on the canvas** — it is a DOM element (`MultiplierDisplay`); the scene does **not** consume ticks.

## SDK sources

The full map of the reference implementation's bridge. The scene consumes only `sfs:phase-change` from it; the rest is read by UI hooks — `sfs:tick` (`useTick`, the loader's next-round progress, MyBets refresh, roundId), `sfs:crash-state`, `sfs:bet-placed`, `sfs:bet-update`, `sfs:my-username`, `sfs:betting-history-clear` (betting history), `loader:*` (loading screen). Re-emit only what your canvas and hooks need.

| SDK event | EventBus name | payload |
| `tick` | `sfs:tick` | `TickPayload` |
| `phase-change` | `sfs:phase-change` | `{ phase, roundId }` |
| `phase-change` (BETTING_OPEN) | `sfs:betting-history-clear` | — |
| `crash` | `sfs:crash-state` | `{ crashed: true }`, then after **100 ms** `{ crashed: false }` |
| `balance` | `sfs:balance` | `{ balance }` |
| `bet-placed` | `sfs:bet-placed` | `BetPlacedPayload` |
| `cashout-done` | `sfs:cashout-done` | `CashoutDonePayload` |
| `cancel-bet-ok` | `sfs:cancel-bet-ok` | `CancelBetOkPayload` |
| `bet-update` | `sfs:bet-update-broadcast` **and** `sfs:bet-update` | `BetUpdatePayload` |
| `connection-change` | `sfs:connection` | `{ state }` |
| `game-config` | `sfs:game-config` | `GameConfig` |
| `game-history` | `sfs:game-history` | `GameHistoryItem[]` |
| `round-my-bets` | `sfs:round-my-bets` | `RoundMyBetsPayload` |
| `my-history` | `sfs:my-history` | `MyHistoryPayload` |
| `ping-pong` | `sfs:ping-pong` | `{ lagValue }` |
| `session-expired` | `sfs:session-expired` | — |
| `error` | `sfs:error` | `{ message }` |
| `game-frozen` | `sfs:game-frozen` | `{ frozen }` |
| `username` | `sfs:my-username` | `{ username }` |
| `server-connected` / first `connection-change: connected` | `loader:server-connected` | — |
| `launchStatus === 'ready'` | `loader:authenticated` | — |
| Phaser scene's first `POST_UPDATE` | `loader:assets-loaded` | — |

The `loader:*` events feed the reference implementation's loading screen (`MainLoader`); `loader:server-connected` may arrive twice (socket + first `connected`), so the loader collects received events by name (a `receivedEvents` Set).

**Back-channel (UI → SDK)**:

| EventBus | SDK |
| `cmd:get-history {limit?}` | `client.getHistory(limit ?? 50)` |
| `cmd:get-my-history {limit?, offset?}` | `client.getMyHistory(limit ?? 50, offset ?? 0)` |

**Phaser-internal events** (do not involve the SDK): `set-mobile` (PhaserGame → scene), `game-resize` (PhaserGame → scene), `scene-ready` (scene → PhaserGame/EventBus flag).

## Actions → SDK

The canvas layer sends nothing to the SDK. The only UI→SDK path is the `cmd:*` back-channel (above), used by statistics and MyBets — Phaser is not involved in it.

## States and edge cases

The scene's phase logic (reference implementation):

| Phase | Animation | FPS | overlay |
| `BETTING_OPEN`, `BETTING_CLOSING` | `Idle` loop | 30 | hide (300 ms fade) |
| `FLYING` | `Action` / `Action_2` alternating (`flyingAnimationIndex`), loop | 60 | hide |
| `CRASHED` | `Win` once (`isWinAnimationPlaying`), `Idle` on completion | 60 | show (300 ms fade, red gradient `0xe5152d → 0x991423`) |

- **Phase changed during Win** — `Win` is not interrupted; the BETTING phases only hide the overlay.
- **Same phase again** — `currentPhase` guard, nothing happens.
- **Tick** — the scene does not need it; the multiplier is in the DOM. If you want it on the canvas, listen to the bridged `sfs:tick` or directly to `client.on('tick')`.
- **Animation off** — the scene draws, the wrapper has `opacity: 0` (14).
- **Container < 64 px** (an iframe that starts small) — the Phaser React wrapper defers init with `requestAnimationFrame` until the size grows (to avoid WebGL framebuffer errors).
- **Resize / orientation / fullscreen / visibility** — the wrapper calls `scale.refresh()` + emits `game-resize` (100 ms debounce; immediately on fullscreen).
- **Mobile framing** — zoom = `max(zoomX, zoomY)`, the camera centres on the character's body (`bodyPositionRatio 0.62`), vertical offset 300/zoom. Desktop: centre, cover zoom.
- **World** — always `1920×1080`, the presets are identical.
- **Reconnect / frozen / freebet / autoplay** — do not involve the scene; the phase arrives via `phase-change`.

## Reference implementation

Building blocks:

- `SdkEventBridge` — SDK → EventBus map, loader events, `cmd:*` back-channel.
- `EventBus` — `new Phaser.Events.EventEmitter()` + `sceneReady` flag.
- events module — re-export of SDK payload types + `ConnectionPayload`.
- Phaser config — `WEBGL`, transparent, `Scale.RESIZE` + `CENTER_BOTH`, `fps.target 30`, `mipmapFilter/autoMobilePipeline/maxLights` restrictions inside an iframe, Spine plugin.
- `Game` scene — preload Spine assets, two cameras (world with zoom, UI zoom 1), phase handler.
- `GameResolution` — world size singleton + `subscribe`.
- `PhaserGame` — React wrapper of the Phaser instance (deferred init, resize, `set-mobile`).
- `PhaserGameWrapper` — `isMobile` prop + animation-off opacity.

Reference implementation — the bridge (`EventBus` — the app's local `Phaser.Events.EventEmitter`):
```
useEffect(() => {
  const unsubs = [
    client.on('tick', (payload) => {
      EventBus.emit('sfs:tick', payload);
    }),
    client.on('phase-change', (payload) => {
      EventBus.emit('sfs:phase-change', payload);
    }),
    // ...
    client.on('crash', (payload) => {
      EventBus.emit('sfs:crash-state', { crashed: true });
      setTimeout(() => {
        EventBus.emit('sfs:crash-state', { crashed: false });
      }, 100);
    }),
  ];

  const handleGetMyHistory = (cmd: { limit?: number; offset?: number }) => {
    client.getMyHistory(cmd.limit ?? 50, cmd.offset ?? 0);
  };
  const handleGetHistory = (cmd: { limit?: number }) => {
    client.getHistory(cmd.limit ?? 50);
  };
  EventBus.on('cmd:get-my-history', handleGetMyHistory);
  EventBus.on('cmd:get-history', handleGetHistory);

  return () => {
    unsubs.forEach(unsub => unsub());
    EventBus.off('cmd:get-my-history', handleGetMyHistory);
    EventBus.off('cmd:get-history', handleGetHistory);
  };
}, [client]);

```

Reference implementation — the scene's phase handler:
```
switch (phase) {
  case GamePhase.BETTING_OPEN:
  case GamePhase.BETTING_CLOSING:
    this.game.loop.targetFps = 30;
    this.mainCharacter.animationState.setAnimation(0, 'Idle', true);
    this.isWinAnimationPlaying = false;
    this.hideLossOverlay();
    break;

  case GamePhase.FLYING: {
    this.game.loop.targetFps = 60;
    const flyingAnimations = ['Action', 'Action_2'];
    const animationName =
      flyingAnimations[this.flyingAnimationIndex % flyingAnimations.length];
    this.mainCharacter.animationState.setAnimation(0, animationName, true);
    this.flyingAnimationIndex++;
    this.isWinAnimationPlaying = false;
    this.hideLossOverlay();
    break;
  }

  case GamePhase.CRASHED:
    this.game.loop.targetFps = 60;
    if (!this.isWinAnimationPlaying) {
      this.isWinAnimationPlaying = true;
      this.mainCharacter.animationState.setAnimation(0, 'Win', false);
    }
    this.showLossOverlay();
    break;

```

Reference implementation — deferred init (`StartGame` creates the `Phaser.Game` instance):
```
const initGame = () => {
  const container = document.getElementById('game-container');
  const w = container?.clientWidth || 0;
  const h = container?.clientHeight || 0;
  if (w < 64 || h < 64) {
    requestAnimationFrame(initGame);
    return;
  }
  game.current = StartGame('game-container');
  // ...
};
initGame();

```

**UI policy (skin responsibility) vs SDK:** the EventBus names, the 100 ms `sfs:crash-state` pulse, the loader events, the `cmd:*` back-channel, the Spine animation names, FPS — skin. SDK: `client.on(...)`, `getHistory`, `getMyHistory`. The SDK does not need Phaser and is unaware of its existence.

## Minimal example (React + Vite)

A generic bridge for any emitter (Phaser `EventEmitter`, Pixi `utils.EventEmitter`, mitt — all have `emit`) and a renderer-agnostic phase handler.
```
import { useEffect } from 'react';
import { useKrashClient, GamePhase } from '@krash/react';
import type { GameEventMap } from '@krash/react';

type Emitter = { emit: (name: string, payload?: unknown) => unknown };

/** SDK → your emitter. The `events` list determines what is re-emitted. */
export function SdkBridge({ bus, events }: { bus: Emitter; events: ReadonlyArray<keyof GameEventMap> }) {
  const client = useKrashClient();
  useEffect(() => {
    const offs = events.map(name =>
      client.on(name, (payload) => { bus.emit(`sfs:${name}`, payload); })
    );
    return () => offs.forEach(off => off());
  }, [client, bus, events]);
  return null;
}

/** Renderer-agnostic phase handler — use it in a Phaser scene, a Pixi ticker or the DOM. */
export interface PhaseVisuals {
  idle(): void;
  flying(): void;
  crashed(multiplier: number): void;
}

export function bindPhaseVisuals(
  client: ReturnType<typeof useKrashClient>,
  visuals: PhaseVisuals,
): () => void {
  let current: GamePhase | null = null;
  const offPhase = client.on('phase-change', ({ phase }) => {
    if (phase === current) return;
    current = phase;
    if (phase === GamePhase.FLYING) visuals.flying();
    else if (phase !== GamePhase.CRASHED) visuals.idle();
  });
  const offCrash = client.on('crash', ({ multiplier }) => visuals.crashed(multiplier));
  return () => { offPhase(); offCrash(); };
}

/** DOM example: three CSS classes. */
export function DomVisualLayer() {
  const client = useKrashClient();
  useEffect(() => {
    const el = document.getElementById('game-visual');
    if (!el) return;
    return bindPhaseVisuals(client, {
      idle: () => { el.className = 'visual visual--idle'; },
      flying: () => { el.className = 'visual visual--flying'; },
      crashed: () => { el.className = 'visual visual--crashed'; },
    });
  }, [client]);
  return <div id="game-visual" className="visual visual--idle" />;
}

```

Usage: `<SdkBridge bus={EventBus} events={['tick', 'phase-change', 'crash']} />` — in the Phaser scene `EventBus.on('sfs:phase-change', ...)`.

## Common mistakes

- **Re-emitting every event "just in case"** — a bridge that forwards every SDK event soon fills up with names nobody listens to. Re-emit only what the canvas needs.
- **Scene init after the phase has arrived** — the scene learns the current phase only on the next `phase-change`; if the scene loads late, read `client.store.getSnapshot().phase` in create().
- **Rendering tick on the canvas through React state** — 10 Hz tick × setState = excess renders. The reference implementation's `useTick` reads directly from the EventBus; for the canvas, `EventBus.on` in the scene is enough.
- **Phaser init in a 0×0 container** — WebGL errors inside an iframe; use deferred init.
- **Duplicating `crash` and the CRASHED `phase-change`** — both arrive; attach the animation to one of them (the reference implementation uses `phase-change` for the animation, and `crash` — for the betting history).
- **Listener leak in StrictMode** — `client.on` returns an unsubscribe function; always return it in the cleanup.

