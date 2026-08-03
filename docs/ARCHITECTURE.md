# Architecture

How the canvas, events, engine and sprites fit together.

A crash game with a Spine-animated canvas, a local engine standing in for a
server, and one event bus between them. Nothing calls across the layers
directly — which is the point, and the reason the engine can be deleted and
replaced by a socket handler that emits the same names.

---

## The shape of it

```
crashEngine ──▶ EventBus ──▶ gameStore · freeBetStore ──▶ hooks · UI
                   │
                   └───────▶ GameScene (Phaser + Spine)

BetArea buttons ──▶ gameActions (cmd:*) ──▶ EventBus ──▶ crashEngine
```

The engine never imports React, the scene never imports the store, and
components never touch the engine. The canvas and the DOM subscribe to the
_same_ phase events, so the boy throws the ball on the beat the multiplier
starts climbing without either side knowing the other exists.

---

## Events

`game/EventBus.ts` is a hand-rolled emitter — `on / once / off / emit` plus a
`context` argument so a Phaser scene method keeps its `this`.

> **Why not Phaser's emitter.** Half the React app imports the bus. Reusing
> `Phaser.Events.EventEmitter` would pull the whole Phaser bundle into the main
> chunk and defeat the lazy-loading below.

Names are grouped by direction, and the grouping is the contract:

| Direction       | Prefix      | Carries                                                                                                            |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| engine → app    | `engine:*`  | `Tick`, `CrashState`, `Balance`, `BetPlaced`, `CashoutDone`, `BetUpdate`, `NewBettingRound`, `CrashHistoryItem`     |
| app → engine    | `cmd:*`     | `CmdPlaceBet`, `CmdCashout`, `CmdCancelBet` — emitted only through `gameActions`                                    |
| React ↔ Phaser  | —           | `GamePhaseChange`, `SceneReady`, `RequestPhaseSync`, `GameResize`                                                   |

`RequestPhaseSync` earns its place: the canvas loads lazily and can boot
mid-round, so on `create()` the scene asks the engine to re-broadcast the
current phase instead of assuming it started at a round boundary.

---

## The engine

`game/engine/crashEngine.ts` is a singleton class owning the round loop, the
crash point and the balance. Four states on a fixed cadence:

| Phase             | Duration | What happens                                        |
| ----------------- | -------- | --------------------------------------------------- |
| `BETTING_OPEN`    | 6000 ms  | stakes accepted, multiplier parked at 1.00×          |
| `BETTING_CLOSING` | 800 ms   | lock-in; the throw's wind-up fills it                |
| `FLYING`          | variable | until the multiplier reaches the crash point         |
| `CRASHED`         | 3000 ms  | live bets lost, result pushed to the history strip   |

### Three clocks, on purpose

- `setTimeout` drives phase transitions.
- A 100 ms `setInterval` runs during betting, purely so the countdown animates.
- `requestAnimationFrame` drives the flight.

The multiplier is a function of wall-clock time, recomputed every frame from
`now() - flyStart` and never accumulated, so a dropped frame can't drift it:

```
multiplier = e^(0.15 · elapsedSeconds)   // ~2× at 4.6s, ~10× at 15s
```

### The draw

The crash point is drawn once, up front, before anyone has bet:

```
2% of rounds  → instant bust at 1.00×
otherwise     → 0.97 / (1 − random)      // capped at 1000×
```

That is the standard crash curve: ~97% RTP, median around 1.9×.

### Bets

Two slots, one array, states running `Queued → Placed → Active → Won | Lost`.
Two behaviours do the heavy lifting:

- **Pre-bets.** Betting outside the window doesn't fail — it parks a `Queued`
  bet that the next window promotes, re-checking affordability before charging
  anything.
- **Auto-cashout** settles at the _target_ multiplier, not the current one, so a
  fast frame can't pay more than was asked for.

---

## State in React

Three external stores read through `useSyncExternalStore`. No context
providers, no prop drilling.

| Store           | Holds                                                       | Written by                       |
| --------------- | ----------------------------------------------------------- | -------------------------------- |
| `gameStore`     | phase, balance, crash history, bets feed, per-slot bet state | engine events                    |
| `freeBetStore`  | grants and which one is staked                              | engine events + the grants modal |
| `settingsStore` | sound, music, animation switches                            | the menu, through to localStorage |

`gameStore` keeps sub-object identity when nothing changed, so a selector hook
only re-renders its own consumers. The bets feed is newest-first and capped at
100 rows; it spans rounds rather than clearing, so older bets stay in the list.

> **The one exception.** The live multiplier is deliberately not in the store —
> it changes ~60×/sec and would thrash every subscriber. `useTick` subscribes to
> `Tick` directly, so only the components that render the number re-render.

---

## The canvas

Phaser sits behind a `lazy()` import, keeping its ~1.4 MB chunk (374 KB gzipped)
out of the main bundle. With the menu's Animation switch off it is never fetched
at all: the stage renders a still image, and the HUD — multiplier and countdown —
is DOM either way. That is what makes the still mode possible; the numbers a
player needs are never trapped inside the canvas.

### Resolution

Phaser's `RESIZE` scale mode hard-wires the backing store to CSS pixels, which
on a retina screen draws everything at half resolution and lets the browser
upscale it. So the game sizes the canvas in _device_ pixels and scales it back
down:

```
dpr    = min(devicePixelRatio, 2)   // past 2× the fill rate costs more than it shows
width  = parent.clientWidth  · dpr
height = parent.clientHeight · dpr
scale  = { mode: NONE, zoom: 1 / dpr }
```

A `ResizeObserver` in `containers/GameStage/PhaserGame.tsx` drives that size.
The scene measures everything as a fraction of `scale.width/height`, so it never
needs to know.

### Two guards worth knowing about

- The `Game` instance is a module-level singleton with a 300 ms destroy timer,
  so React's double-mount in StrictMode doesn't tear down and re-boot WebGL.
- `fps.smoothStep` is off. Phaser caps frame deltas at 16.67 ms while a tab is
  unfocused — measured at 54% speed on 30 ms frames — which would have the boy
  juggling in slow motion while the multiplier kept real time.

---

## Sprites

Two Spine skeletons: a looping beach background and the character. The round is
**one skeleton playing three clips**, so every transition is real pose mixing
rather than a cut between game objects.

| Phase             | Clip             | What you see                                                                    |
| ----------------- | ---------------- | ------------------------------------------------------------------------------- |
| `BETTING_OPEN`    | `agdeba` @ 0     | the throw frozen on frame 0 — ball in hand — with a 1.2% breathing swell / 2.6 s |
| `BETTING_CLOSING` | `agdeba`         | the throw runs; its ~0.65 s wind-up matches the lock-in beat                     |
| `FLYING`          | `animation`      | at the apex the juggle loop takes the ball over                                  |
| `CRASHED`         | `dachera`        | he plucks the ball out of the air; the camera flashes red for 200 ms             |

Because the idle stance _is_ the throw's first frame, starting a round needs no
transition at all — the clip simply begins to move.

### Retargeting

The throw lives in the `start` export; the juggle and the catch live in
`catch_ball`. Same character, three exports — but they do not share a rest pose,
so eleven bones sit at different rest angles and the same animated values land
in different places on screen.

`game/spineRetarget.ts` rebuilds the throw against the host rig: sample the
donor's local pose at 60 fps, then re-express every value against the host's
setup pose — offsets for rotate, translate and shear; _factors_ for scale, which
stores multiples rather than deltas. Bones the clip doesn't animate stay at the
host's rest pose, which is what lets the result blend with the host's own clips
instead of fighting them.

> **Why resample instead of editing the curves.** Spine keeps bezier control
> points in absolute value space alongside the keyframes. Shifting keys without
> shifting their curve data corrupts every interpolated frame between them.
> Resampling sidesteps the curve data and is exact at every sample.

### Aiming the throw

The clips were authored apart, so the throw releases the ball about its own
width from where the juggle expects to pick it up. `aimBoneTranslation()` bends
the flight to land exactly on the juggle's entry pose, ramping the correction
from zero at the release frame: the wind-up and the release are untouched, he
simply throws it at his own head. On a crash the catch is entered at the frame
whose ball sits closest to the live one, so it keeps falling instead of snapping
back up.

### Framing traps

- The character's skeleton bounds are dominated by a painted ground shadow 677
  units wide against his 115, sitting well off-centre — it's detached at create,
  and he is sized and centred on a measured body-only rect.
- A separate envelope rect (body + the ball's airspace) caps the scale so the
  arc never crops at the top.
- The background covers on the _photo_ slot's rect, not the skeleton's: the
  umbrellas overhang the photo, and scaling to them leaves bare strips down both
  edges on wide viewports.
- Atlases are loaded with premultiplied alpha forced off. They are tagged
  `pma:true` but the packed WebPs aren't actually premultiplied, and the additive
  blend rings every cut-out in a pale halo.

---

## Free bets

A grant carries a per-bet price, a granted total, how many are spent, a payout
flavour and a minimum cash-out. One grant is staked at a time and both slots
share it — it is a choice of wallet, not of slot.

Tickets are spent on **placement**, which is why cancelling returns one and
cashing out does not. A free bet skips the funds check and the debit entirely;
settlement then follows the grant — Full Payout credits stake × multiplier, Pure
Profit credits only what the stake earned. When the last ticket goes, the store
unstakes the grant and any auto-play run stops rather than falling through to
real money. Every session opens on real money; staking is always a deliberate
act.

---

## Sound

`playSound()` is a plain module function, not a hook — the noisy controls are
leaf components and would otherwise all have to thread the setting down from
somewhere. It reads `settingsStore` at click time, pools three `Audio` clips per
sound so rapid taps don't cut each other off, and starts each clip at a measured
offset because the assets open with 40–110 ms of silence that reads as input lag.

---

## One round, end to end

1. `enterBettingOpen()` emits `PhaseReset`, `NewBettingRound`,
   `GamePhaseChange`. The store clears the slots, the bot generator spawns 6–14
   fake players, the scene freezes the throw on frame 0, the countdown starts.
2. You press Bet. `gameActions.placeBet` → `cmd:place-bet` → the engine debits
   the balance (or spends a free-bet ticket) → `BetPlaced` + `BetUpdate`. The
   button becomes Cancel.
3. `BETTING_CLOSING`: the scene starts the throw, so the ball is already
   airborne before the number moves.
4. `FLYING`: bets go Active, the rAF loop ticks the multiplier, `useTick`
   re-renders the big number, the ball hands off to the juggle at the apex.
5. You cash out. `CashoutDone` + `BetUpdate(Won)` → balance credited, and the
   win notice shows for four seconds.
6. The multiplier reaches the crash point. Remaining bets are lost, the result is
   pushed onto the history strip, the catch plays, the camera flashes. Three
   seconds later, back to step one.

---

## Where things live

| Path                            | Role                                              |
| ------------------------------- | ------------------------------------------------- |
| `game/EventBus.ts`              | the emitter everything meets on                   |
| `game/events.ts`                | event names and payload shapes                    |
| `game/engine/crashEngine.ts`    | round loop, crash draw, balance, bets             |
| `game/engine/fakeBets.ts`       | bot players for the live list                     |
| `game/store.ts`                 | engine events folded into a React snapshot        |
| `game/freeBetStore.ts`          | grants and the staked one                         |
| `game/config.ts`                | timings, curve, crash distribution                |
| `game/main.ts`                  | Phaser boot, DPR and scale mode                   |
| `game/scenes/GameScene.ts`      | the choreography, layout and framing              |
| `game/spineRetarget.ts`         | moving a clip between rig exports                 |
| `containers/GameStage/`         | canvas or still image, plus the HUD over it       |
| `hooks/useTick.ts`              | the high-frequency subscription                   |
| `hooks/useAutoPlay.ts`          | the auto-bet loop, driven off phase events        |

Timings, curve constants and bot counts all live in `game/config.ts`.
