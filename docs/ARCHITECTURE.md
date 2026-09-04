# Architecture

How the canvas, events, SDK and sprites fit together.

A crash game skin: the round loop, the money and the rules belong to the Krash
SDK, and this repo draws them. There is one seam (`src/sdk`) and one event bus
between React and the canvas.

---

## The shape of it

```
@krash/react ──▶ hooks (useBalance, usePhase, useBetting …) ──▶ components
      │
      └── client.on(...) ──▶ SdkEventBridge ──▶ EventBus ──▶ GameScene (Phaser + Spine)

BetArea buttons ──▶ useBetting().placeBet / cashout / cancelBet ──▶ SDK
```

Nothing in the skin computes game state. The canvas never holds a React
subscription, the components never touch the socket, and both sides read the
same phase — so the boy throws the ball on the beat the multiplier starts
climbing without either side knowing the other exists.

---

## The seam

`src/sdk/` stands in for `@krash/sdk` + `@krash/react`, which are not installed
yet. Everything game-related is imported from `@/sdk` and nowhere else, so
installing the packages is a change to five files and nothing else. The folder's
own README explains which parts are inert and which are implemented, and why.

The integration documentation lives in `.claude/sdk-docs/`. Its `panels/`
chapters are the authority on where a piece of logic belongs: each one ends with
a split between what the SDK does and what is the skin's.

---

## Events

`game/EventBus.ts` is a hand-rolled emitter — `on / once / off / emit` plus a
`context` argument so a Phaser scene method keeps its `this`.

> **Why not Phaser's emitter.** Half the React app imports the bus. Reusing
> `Phaser.Events.EventEmitter` would pull the whole Phaser bundle into the main
> chunk and defeat the lazy-loading below.

The bus carries two kinds of name, and the grouping is the contract:

| Direction        | Prefix   | Carries                                        |
| ---------------- | -------- | ---------------------------------------------- |
| SDK → skin       | `sfs:*`  | `PhaseChange`, relayed verbatim by `SdkEventBridge` |
| React ↔ Phaser   | —        | `SceneReady`, `RequestPhaseSync`               |

`sfs:*` names are **relays, not sources**: only the bridge may emit one. This is
the arrangement the SDK's canvas chapter prescribes — one subscription near the
root, re-emitted on a plain emitter.

`RequestPhaseSync` earns its place: the canvas loads lazily and can boot
mid-round, so on `create()` the scene asks for the current phase instead of
assuming it started at a round boundary.

Only what something actually consumes is listed. The bus used to carry a dozen
`engine:*` and `cmd:*` names for a local engine; that engine is gone. Adding a
name back is a line in each file when a consumer appears — the sound layer will
want `crash` and `cashout-done`.

---

## The round

The SDK owns it. The server sends a `tick` roughly every 100 ms carrying the
phase, the multiplier, the round id and how much of the phase is left; the SDK
turns that into a phase change, a crash, a crash-history item and a store
update. Four phases, in a fixed cycle:

```
BETTING_OPEN → BETTING_CLOSING → FLYING → CRASHED → BETTING_OPEN → …
```

**The durations are not ours and are not fixed.** Nothing in the skin may
hardcode a phase length: the countdown bar measures itself against the first
tick of each betting window, because that tick is the only statement of how long
the window is. Details in `.claude/sdk-docs/03-game-phases.md`.

---

## State in React

No stores. Every value is an SDK hook, and each one subscribes to a single slice
so a change re-renders only what reads it:

| Read                      | Hook                                        |
| ------------------------- | ------------------------------------------- |
| balance                   | `useBalance()`                              |
| phase, multiplier         | `usePhase()`, `useMultiplier()`             |
| a bet slot                | `useBetting(slot)` / `useBettingSlot(slot)` |
| auto-play                 | `useAutoPlay(slot)`                         |
| free bets                 | `useFreerounds()`                           |
| crash history             | `useGameHistory()`, merged by `useCrashHistory` |
| limits, currency, presets | `useGameConfig()`, `useMoney()`             |
| sound / music / animation | `useSettings()`                             |

Three of the skin's own hooks exist because the SDK deliberately leaves the
shape to us — the countdown (`useRoundCountdown`), the live bets feed
(`useRoundBets`) and the merged crash history (`useCrashHistory`). Each says so
in its header, with the chapter that settles it.

> **The live multiplier.** `useMultiplier()` re-renders its consumer on every
> FLYING tick, so it is called in the leaf that draws the number and nowhere
> else. The canvas takes ticks off the EventBus instead.

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

A grant is a wallet, not a book of tickets: a balance the server debits when it
accepts a bet, with a per-bet amount (fixed grants) or a range (range grants)
and a minimum cash-out multiplier. One grant is bound at a time and both slots
share it — it is a choice of wallet, not of slot.

All of the accounting is the SDK's: attaching the grant to a bet, the balance
after each placement, giving it back on a cancel, closing the grant out when it
is spent and stopping auto-play so the next round cannot reach for real money.
The skin holds the parts the SDK documents as its own:

- the X/Y badge — a division of the grant's balance, never a tally we keep;
- clamping a range grant's stake to `[betMin, min(betMax, balanceRemaining)]`,
  because the SDK sends whatever it is given;
- holding the cashout button below the grant's `minCashout`, for the same reason;
- locking a slot when the grant has no unreserved bet left for it;
- the `Freebet` face of the bet button, which the SDK never returns itself.

`game/freerounds.ts` holds those formulas and nothing else. See
`.claude/sdk-docs/11-freerounds.md` for the full lifecycle, and its "what the
SDK does not do" table for the division of labour.

---

## Sound

`playSound()` is a plain module function, not a hook — the noisy controls are
leaf components and would otherwise all have to thread the setting down from
somewhere. The setting itself belongs to the SDK's `SettingsProvider`; because a
module function cannot read a context, `useSoundSettings` mirrors `sound` into
the module and runs the music bed off `music`. One writer, mounted once.

It pools three `Audio` clips per sound so rapid taps don't cut each other off,
and starts each clip at a measured offset because the assets open with 40–110 ms
of silence that reads as input lag.

---

## One round, end to end

1. The server's first `BETTING_OPEN` tick arrives. The SDK clears both slots,
   sends any pending bets and starts auto-play's next round; `SdkEventBridge`
   relays the phase to the canvas, which freezes the throw on frame 0; the
   countdown bar takes its full width from that tick's `remainingMs`.
2. You press Bet. `useBettingSlot().onBet` → the SDK sends `PlaceBet` and marks
   the slot as sending; on the server's `BetPlaced` the button becomes Cancel.
3. `BETTING_CLOSING`: every button is disabled by the SDK's own variant
   calculation, and the scene starts the throw — the ball is airborne before the
   number moves.
4. `FLYING`: placed bets go Active, ticks drive the multiplier, the ball hands
   off to the juggle at the apex.
5. You cash out — or the server does it for you, if auto-cashout was sent with
   the bet. Either way it is one `CashoutDone`: the balance updates, the slot
   shows Won, and the win notice runs for four seconds.
6. `CRASHED`: remaining bets are lost, the SDK emits the finished round, the
   strip and the statistics pick it up, the catch plays and the camera flashes.
   Then back to step one.

---

## Where things live

| Path                            | Role                                              |
| ------------------------------- | ------------------------------------------------- |
| `sdk/`                          | the seam: types, client, hooks, contexts, DOM utils |
| `game/EventBus.ts`              | the emitter React and Phaser meet on              |
| `game/events.ts`                | bus names and payload shapes                      |
| `game/SdkEventBridge.tsx`       | the one place SDK events reach the bus            |
| `game/freerounds.ts`            | free-bet display formulas and the slot lock       |
| `game/display.ts`               | the two timings the picture needs                 |
| `game/sounds.ts`                | clip pools, the music bed                         |
| `game/main.ts`                  | Phaser boot, DPR and scale mode                   |
| `game/scenes/GameScene.ts`      | the choreography, layout and framing              |
| `game/spineRetarget.ts`         | moving a clip between rig exports                 |
| `containers/GameStage/`         | canvas or still image, plus the HUD over it       |
| `hooks/useRoundCountdown.ts`    | the betting window, off the tick event            |
| `hooks/useRoundBets.ts`         | the live bets feed, off `bet-update`              |
| `hooks/useCrashHistory.ts`      | server history merged with live crashes           |
| `hooks/useMoney.ts`             | currency code and the operator's decimals         |

Nothing in this table decides a bet, a phase or a payout. That all lives behind
`@/sdk`.
