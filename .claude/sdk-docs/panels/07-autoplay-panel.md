<!-- source: https://krash-sdk-docs.playcore.live/en/panels/07-autoplay-panel/ -->

# 07. Auto-play panel

The auto-play panel is a per-slot configuration form: auto cashout toggle + multiplier, a rounds grid (20 / 50 / 100 / 200), a "More options" block with three stop conditions, Reset and Start/Stop buttons. In the reference implementation it unfolds inline inside the betting panel on desktop and opens in a separate popup on mobile. In both cases the same content component is rendered, which receives the object returned by `useAutoPlay(slot)` as the `autoPlayInstance` prop.

## What it shows

- **Auto cashout** — toggle (`enabled`) and multiplier input (`x` suffix). Input min. `minValue ?? 1.01`, max. `25000`, step `0.1`.
- **Rounds grid** — four buttons from `useAutoPlay().roundOptions` (`[20, 50, 100, 200]`). The active button shows `currentRound` (remaining rounds, **counts down**) and `/rounds`; the label changes "Rounds" → "Stop", the icon Play → Stop.
- **More options** header (chevron) — fully hidden in freebet mode.
- **Stop if cash decreases / increases / single win exceeds** — one row each: `Toggle` + amount input (`minValue 0.01`, `maxValue 1000`, `step 1`).
- **Reset** — zeroes the rounds and the stop limits (auto cashout stays).
- **Start / Stop** — Start is shown when `isActive === false`, Stop — when `true`.
- On the betting panel's autoplay button (desktop) — a counter with the remaining rounds and a green dot if auto cashout is enabled.

## SDK sources

| Data | Source | Type | Note |
| `config` | `useAutoPlay(slot).config` | `AutoPlayConfig` | `engine.config` — `rounds`, `autoCashOut`, `stopOnCashDecrease`, `stopOnCashIncrease`, `stopOnSingleWin`, `isEnabled` |
| `isActive` | `useAutoPlay(slot).isActive` | `boolean` | `engine.isActive` |
| `currentRound` | `useAutoPlay(slot).currentRound` | `number` | `=== engine.remainingRounds` (`totalRounds - currentRound`, counts down). The engine's own `AutoPlayState.currentRound` counts up — do not confuse the two |
| `totalRounds` / `remainingRounds` | `useAutoPlay(slot)` | `number` | `remainingRounds` is an alias of `currentRound` |
| `roundOptions` | `useAutoPlay(slot).roundOptions` | `number[]` | the values of the `AutoPlayRoundOption` enum `[20, 50, 100, 200]` |
| stop reason | `client.on('autoplay-stop')` | `{ slot: BetSlot; reason: AutoPlayStopReason }` | `AutoPlayEngine.stop()` emits only if `isActive` was true |
| default multiplier | `AutoPlayEngine` `DEFAULT_CONFIG` | `2.0` | overridden by `gameConfig.clientConfig.defaultAutoCashout` (the reference implementation writes it via `updateConfig`) |
| persisted config | `PersistentState.saveAutoPlayConfig(slot, config)` | localStorage | key `krash.game_state:<username>:<gameId>`, field `autoPlayConfig[slot]`; `hydrate()` runs on the `'username'` event |

`useAutoPlay` triggers a re-render only on `autoplay-stop` (for its own slot), on `phase-change` (if `engine.isActive`) and on its own actions (`forceUpdate`). A `config` change from another component does **not** update this hook instance — that is why the reference implementation creates a single `useAutoPlay` instance in its own adapter hook over the SDK (`useBettingContext()`) and passes it everywhere.

## Actions → SDK

| Action | What it calls | What happens in the SDK / on the server |
| round button (start) | `autoPlay.startAutoPlay(rounds)` | `engine.start(rounds)` → `isActive=true`, `currentRound=0`, `totalRounds=rounds`, `startingBalance=balance`, config persist; `client.notifyAutoPlayChanged()` → the button variant is recomputed (`CancelWaiting`). If the phase is already `BETTING_OPEN` — `engine.onNewRound()` in 20 ms → the first bet is placed immediately |
| round button (select) | `autoPlay.selectRounds(rounds)` | `engine.selectRounds` → `totalRounds=rounds` + `updateConfig({ rounds })`; no bet is placed |
| Stop | reference implementation: `onStopAutoPlay()` = `autoPlay.stop()` + `betting.cancelBet()` | `engine.stop(MANUAL_STOP)` → `autoplay-stop`; `cancelBet` cancels this slot's pending/placed bet (`CancelBet` on the server, timeout 3000 ms) |
| Auto cashout toggle | `autoPlay.updateConfig({ autoCashOut: { ...cfg, enabled } })` | config persist. The multiplier goes to the server only with the next bet (`placeBet(amount, { autoCashoutAt })`) |
| Auto cashout multiplier | `updateConfig({ autoCashOut: { ...cfg, multiplier } })` (real money) / local override state (freebet) | see "Freebet override" below |
| Stop condition toggle / amount | `autoPlay.updateConfig({ stopOnCashDecrease: {...} })` etc. | persist; checked only in `onNewRound()` (`BETTING_OPEN`) |
| Reset | `autoPlay.reset()` | `engine.reset()` → `isActive=false`, `rounds=0`, all three stop conditions `{enabled:false, amount:0}`, **`autoCashOut` unchanged**; persist |
| Start (More options) | `handleAutoPlayStart(autoPlay.config.rounds)` | same as the round button |

### Engine lifecycle (SDK)

`KrashClient` wires the engine to the game (`core/KrashClient.ts:108-138`):

- `phase-change → BETTING_OPEN` — `engine.onNewRound()` on both slots: first `checkStopConditions()` (cash decrease/increase relative to `startingBalance`, single win via `lastWinProfit`), then the round limit (`COMPLETED`), then `balance <= 0` → `ERROR`; if all pass — `onBet(autoCashoutAt)` where `autoCashoutAt = config.autoCashOut.enabled ? config.autoCashOut.multiplier : undefined`.
- `onBet` callback — `bettingEngine.placeBet(slot, store.slots[slot].betInputAmount, { autoCashoutAt })`. On a fixed freebet `BettingEngine.placeBet` replaces the amount with the grant's `betAmount` (`betting/BettingEngine.ts:161-164`).
- `bet-placed` → `engine.onBetConfirmed()` — a round is counted **only on the server's confirmation**.
- `cashout-done` → `engine.onWin(profit)`; if `remainingRounds <= 0` — `stop(COMPLETED)` immediately.
- `phase-change → CRASHED` → `engine.onRoundComplete()` — if it was the last round, `stop(COMPLETED)` right here (so the button doesn't stay in `CancelWaiting`).
- `freeround-completed` → both active engines `stop(FREEROUND_COMPLETED)` — there is no switch-over to wallet money (`core/KrashClient.ts:171-177`).

Autoplay activity also changes the button variant (`betting/buttonVariant.ts:59,81,93`): without a bet, in the `BETTING_OPEN`/`FLYING`/`CRASHED` phases `isAutoPlayActive` → `CancelWaiting` (enabled).

## States and edge cases

| State | Panel |
| `isActive === true` | all configuration is locked (`isAutoPlayLocked`): auto cashout toggle/input, stop condition toggles and inputs, Reset. The rounds grid stays active (for stop/restart). Start → Stop |
| `config.rounds === 0` | Start disabled |
| More options is open and no option is valid | Start disabled (`showMoreOptions && !hasValidOption`; valid = `enabled && amount >= 0.01`) |
| any stop option is enabled | the More options header opens automatically and **can no longer be collapsed** (header click → `setShowMoreOptions(true)`) |
| Rounds button, More options closed | active + the same round → stop; every other case → `startAutoPlay(rounds)` (restart with a new cycle) |
| Rounds button, More options open | active + same → stop; active + different → restart; inactive → `selectRounds` (selection only, the Start button starts it) |
| Freebet active | the More options block is not rendered; the auto cashout input gets `minValue = freeroundState.minCashout`; multiplier override (see below); slot 2 autoplay stops automatically on the last free bet; on a range freebet auto-stop if the sum > `balanceRemaining` |
| Freebet finished / unbind | the reference implementation calls `stop()` on both slots, `autoCashOut.enabled=false`, the multiplier is restored from localStorage; the SDK on `freeround-completed` only stops the engine — it does **not** turn off the `enabled` flag |
| bet active/placed/pending | auto cashout cannot be changed (`canChangeCashout === false`) — the toggle and multiplier are ignored |
| balance < bet (real money, Bet click) | reference implementation: `stop()` autoplay on both slots + `openCashier()` (UI policy). The SDK's engine stops with `ERROR` only if `balance <= 0` at the moment of `BETTING_OPEN` |
| Cancel/CancelWaiting click during autoplay | reference implementation: `autoPlay.stop()` + `betting.cancelBet()` |
| Page refresh | the config (rounds, autoCashOut, stop limits) comes back via `hydrate()` on the `'username'` event; **`isActive` is not restored** — autoplay always starts stopped |
| Reconnect | the engine does not stop; bets will be placed again on the next `BETTING_OPEN` |
| Frozen | the engine does not care about freeze; the button's `disabled` comes separately from `buttonVariant` |

## Reference implementation

The reference implementation splits the panel like this: one content component (rounds grid, more options, stop conditions, Reset/Start/Stop, rounds click logic), a desktop wrapper (`isVisible` class + `onClose` on Escape), an auto cashout block (toggle + input, `minValue 1.01`, `maxValue 25000`, `step 0.1` defaults), a single round button component (active → `currentRound/rounds` + Stop icon; selected → highlight), a mobile popup wrapper (one per slot; the popup closes on Start) and the betting panel side (inline mount, `showAutoPlay` state, click-outside close, the autoplay button's counter/green dot). The freebet override, slot 2 auto-stop, range guard and `onStopAutoPlay` live in the adapter hook over the SDK, which the components read via `useBettingContext()`.

### Rounds click logic (UI policy)

Reference implementation — the rounds button click logic:
```
const handleRoundClick = (rounds: number, isMoreOptionsOpen: boolean) => {
  const isCurrentlyActive = autoPlay.isActive;
  const isSelectedRound = autoPlay.config.rounds === rounds;

  if (isMoreOptionsOpen) {
    if (isCurrentlyActive) {
      if (isSelectedRound) handleAutoPlayStop();
      else handleAutoPlayStart(rounds);
    } else {
      autoPlay.selectRounds(rounds);       // selection only — the Start button starts it
    }
  } else {
    if (isCurrentlyActive && isSelectedRound) handleAutoPlayStop();
    else handleAutoPlayStart(rounds);      // starts immediately / a new cycle
  }
};

```

The Start button and header rules:
```
useEffect(() => {
  if (hasAnyMoreOptionEnabled) setShowMoreOptions(true);
}, [hasAnyMoreOptionEnabled]);

const isStartDisabled =
  autoPlay.config.rounds === 0 || (showMoreOptions && !hasValidOption);

```

### The `autoCashout` object and freebet override (UI policy)

The SDK's `AutoPlayEngine.onNewRound()` places the bet with `config.autoCashOut.multiplier` and knows nothing about freebet. The reference implementation, however, wants the multiplier not to go below `minCashout` during a freebet and the user's normal value not to be lost. Hence, in the adapter hook:

- `skin:freebetSavedAutoCashout:slot{1|2}` — the user's pre-freebet multiplier (written once, on activation, if it doesn't exist yet).
- `skin:freebetMultiplierOverride:slot{1|2}` — the value entered during the freebet (per-slot, survives refresh).
- The override is initialised with `freeroundState.minCashout` and **synced into the SDK config**, so that the engine uses the correct multiplier in automatic bets.
- On deactivation: both engines `stop()`, `enabled: false`, the saved multiplier is restored, the keys are deleted.

When building the slot's UI state (`buildSlotState` — the adapter hook's function that builds the props object for each slot):
```
const canChangeCashout = (!hasBet && !ss.hasPendingBet)
  || (hasBet && !isBetActive && !(ss.bet?.state === BetState.Placed));

const displayedMultiplier = isFreebetMode && slotOverride !== undefined
  ? slotOverride
  : userAutoCashout.multiplier;
const autoCashout = {
  enabled: userAutoCashout.enabled,
  multiplier: displayedMultiplier,
  onToggle: (enabled: boolean) => {
    if (!canChangeCashout) return;
    autoPlay.updateConfig({ autoCashOut: { ...userAutoCashout, enabled } });
  },
  onMultiplierChange: (multiplier: number) => {
    if (!canChangeCashout) return;
    if (isFreebetMode) {
      const clamped = Math.max(multiplier, freebetMinCashout);
      setFreebetMultiplierOverrides(prev => ({ ...prev, [slot]: clamped }));
    } else {
      autoPlay.updateConfig({ autoCashOut: { ...userAutoCashout, multiplier } });
    }
  },
  canChangeMultiplier: !autoPlay.isActive && canChangeCashout,
  minValue: freebetMinCashout,
};

```

A manually placed bet follows the same `displayedMultiplier`: `betting.placeBet(amount, { autoCashoutAt: enabled ? displayedMultiplier : undefined })`.

### Slot 2 auto-stop and range guard (UI policy)

The SDK engine does not know about the UI lock, so the reference implementation stops it separately:
```
// last free bet → slot 2's autoplay stops, slot 1 keeps it
const remainingFreebets = Math.floor(freeroundState.balanceRemaining / freeBetAmount);
if (remainingFreebets < 2 && slot1AutoPlay.isActive && slot2AutoPlay.isActive) {
  slot2AutoPlay.stop();
}
// range: slot1+slot2 > balance → slot 2 stops; slot1 > balance → slot 1 too

```

### Stop = stop + cancel (UI policy)

Reference implementation — `onStopAutoPlay` (`playSound` — the app's local sound helper):
```
onStopAutoPlay: () => {
  autoPlay.stop();
  betting.cancelBet();
  playSound('betCancelSwitch');
},

```

`onStartAutoPlay` is a no-op — it is only used to close the mobile popup.

### Desktop inline vs mobile popup

- Desktop: the panel is always in the DOM, `isVisible={showAutoPlay}` toggles the class; `useClickOutside(autoPlayPanelRef, closeAutoPlay, showAutoPlay, [autoPlayButtonRef])` closes it. The autoplay button is `disabled={(disabled || hasBetInProgress) && !isActive}` — while autoplay is active the button always opens, so that Stop is reachable.
- Mobile: `betting.activeAutoPlayPopup && betting.activeAutoPlaySlot === slotIndex` → the popup opens; `isFreeBet={isFreeBetActive}` from `useFreerounds()`; opened from the betting panel's autoplay button (`setActiveAutoPlaySlot` + `setActiveAutoPlayPopup(true)`). `betting` here is `useBettingContext()` — the reference implementation's adapter hook over the SDK.

## Minimal example (React + Vite)

```
import { useAutoPlay, BetSlot } from '@krash/react';

const ROUND_MIN = 0.01;

export function AutoPlayPanel({ slot }: { slot: BetSlot }) {
  const ap = useAutoPlay(slot);
  const { autoCashOut, stopOnCashDecrease, rounds } = ap.config;

  const startDisabled =
    rounds === 0 ||
    (stopOnCashDecrease.enabled && stopOnCashDecrease.amount < ROUND_MIN);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={autoCashOut.enabled}
          disabled={ap.isActive}
          onChange={e => ap.updateConfig({ autoCashOut: { ...autoCashOut, enabled: e.target.checked } })}
        />
        Auto cashout
      </label>
      <input
        type="number" min={1.01} max={25000} step={0.1}
        value={autoCashOut.multiplier}
        disabled={ap.isActive || !autoCashOut.enabled}
        onChange={e => ap.updateConfig({ autoCashOut: { ...autoCashOut, multiplier: Number(e.target.value) } })}
      />

      <div>
        {ap.roundOptions.map(n => (
          <button
            key={n}
            onClick={() => (ap.isActive && rounds === n ? ap.stop() : ap.selectRounds(n))}
          >
            {ap.isActive && rounds === n ? `${ap.currentRound}/${n} · Stop` : `${n} rounds`}
          </button>
        ))}
      </div>

      <label>
        <input
          type="checkbox"
          checked={stopOnCashDecrease.enabled}
          disabled={ap.isActive}
          onChange={e => ap.updateConfig({
            stopOnCashDecrease: {
              enabled: e.target.checked,
              amount: Math.max(ROUND_MIN, stopOnCashDecrease.amount),
            },
          })}
        />
        Stop if cash decreases by
      </label>
      <input
        type="number" min={ROUND_MIN} step={1}
        value={stopOnCashDecrease.amount}
        disabled={ap.isActive || !stopOnCashDecrease.enabled}
        onChange={e => ap.updateConfig({
          stopOnCashDecrease: { ...stopOnCashDecrease, amount: Math.max(ROUND_MIN, Number(e.target.value)) },
        })}
      />

      <button onClick={ap.reset} disabled={ap.isActive}>Reset</button>
      {ap.isActive
        ? <button onClick={() => ap.stop()}>Stop</button>
        : <button onClick={() => ap.start(rounds)} disabled={startDisabled}>Start</button>}
    </div>
  );
}

```

`ap.stop()` here only stops the engine — if you also want to cancel the pending bet like the reference implementation does, add `useBetting(slot).cancelBet()`.

## Common mistakes

- Showing `currentRound` as "rounds played" — `useAutoPlay().currentRound` is the **remaining** count (counts down). The only up-counter is `client.getAutoPlay(slot).currentRound`.
- Expecting `start()` to wait for the next round — `start()` called during `BETTING_OPEN` places the first bet within 20 ms.
- Checking the stop conditions on every tick — the SDK checks them **only at the start of `BETTING_OPEN`** (`onNewRound`), so there will be no extra round past the limit, but the current round is not interrupted.
- Using `reset()` to turn off auto cashout — `reset()` keeps `autoCashOut`; use `updateConfig({ autoCashOut: { ...cfg, enabled: false } })`.
- Keeping the freebet multiplier only in UI state — the engine places the bet with `config.autoCashOut.multiplier`; either write it into the config too (the reference implementation's approach), or the cashout will happen at the SDK default 2.0 (or the user's old value).
- Blaming autoplay's `stop()` for cancelling the pending bet — the SDK does not do that; the reference implementation's `onStopAutoPlay` calls `cancelBet()` separately.

