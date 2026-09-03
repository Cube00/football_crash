<!-- source: https://krash-sdk-docs.playcore.live/en/06-hooks-reference/ -->

# 6. Hooks Reference

`@krash/react` exports 28 hooks: 23 from `packages/react/src/hooks/` and 5 context hooks from `packages/react/src/contexts/`. All of them are listed in `packages/react/src/index.ts`. The same file has `export * from '@krash/sdk'` — every SDK type, enum and class is also importable from `@krash/react`.

## Fundamental rule

Store-based hooks (`useBalance`, `usePhase`, …) use `useStoreSlice()` (`packages/react/src/internal/useStoreSlice.ts`): `useSyncExternalStore` + `store.subscribeToKey(key)`. `KrashStore.update()` calls a key's listeners only when the value has changed by `Object.is` (`KrashStore.ts:97-99`). So a granular hook triggers a re-render only on a change of its own key.

Exceptions that often cause confusion:

- **`useKrashClient()` — the foundation of every hook — reads `KrashContext`, whose value is a new object on every render of `KrashProvider`** (`KrashProvider.tsx:126-135`, no `useMemo`). So every hook consumer re-renders when the provider's state changes: `launchStatus`, `session`, `launchError`. This happens a few times during launch and on `session-expired` — not frequent, but not "never".
- **`useBetting(slot)` re-renders on every `BettingEngine.syncStore()`, not only on a change of that slot.** `syncStore` creates the snapshots of both slots as new objects (`BettingEngine.ts:864-867`), while `KrashStore.update` compares a slot by reference (`KrashStore.ts:92-94`). `syncStore` fires on phase-change, on every `'balance'` (keep-alive `GetBalance` once every 5 seconds), on bet/cashout/cancel, on freeround-state, on input change. **It does not fire on tick** — `GameEngine` writes the multiplier directly.
- `useKrashGame()` — global subscribe, on every store update, ticks included.

## Table

### Game state slices

| Hook | Returns | Subscribe | Re-render trigger |
| `useBalance()` | `number` | store `balance` | balance change |
| `usePhase()` | `GamePhase` | store `phase` | phase change |
| `useMultiplier()` | `number` | store `multiplier` | every tick in FLYING; `1` on BETTING_OPEN |
| `useCrashedAt()` | `number \| null` | store `crashedAt` | CRASHED / BETTING_OPEN |
| `useGameConfig()` | `GameConfig \| null` | store `gameConfig` | `GameConfig` response |
| `useCurrencyMode()` | `CurrencyMode` (`'single' \| 'multi'`) | store `currencyMode` | JoinCrashOk |
| `useIsMultiCurrency()` | `boolean` | store `currencyMode` | JoinCrashOk |
| `useBetLayout()` | `{ layout: BetLayout; setLayout }` | store `betLayout` | layout change |
| `useIsGameFrozen()` | `boolean` | store `isGameFrozen` | freeze / unfreeze (2000 ms) |
| `useConnectionStatus()` | `{ state: ConnectionState; lagMs: number }` | store `connectionState` + `'ping-pong'` | connection change, every ping |
| `useHasActiveBets()` | `boolean` | store `hasActiveBets` | a Placed/Active bet appearing/disappearing |
| `useWinDisplay()` | `{ winAmount, winTimestamp, clearWin }` | store `winAmount` + `winTimestamp` | cashout, BETTING_OPEN, `clearWin` |

### Betting & Auto-play

| Hook | Returns | Subscribe | Re-render trigger |
| `useBetting(slot)` | `{ slotState, placeBet, cashout, cancelBet, setBetAmount }` | store slot (`subscribeToSlot`) | every `syncStore` (see above) |
| `useBettingSlot(slot)` | `BettingSlotReturn` | `useBetting` + `useAutoPlay` | the triggers of both |
| `useAutoPlay(slot)` | see below | `'autoplay-stop'`, `'phase-change'` (while active) | stop, phase while active, its own actions |

### Free Bets

| Hook | Returns | Subscribe | Re-render trigger |
| `useFreerounds()` | `UseFreeroundsReturn` | store `freeround`, `freeroundGrants`, `freeroundHistory`, `lastFreeroundSummary` | any of the four |

### History

| Hook | Returns | Subscribe | Re-render trigger |
| `useGameHistory()` | `{ items: GameHistoryItem[]; fetch }` | `'game-history'` event | every `History` response |
| `useMyBets()` | `{ rounds, total, fetch }` | `'my-history'` event | every `MyHistory` response |

### Provider state

| Hook | Returns | Re-render trigger |
| `useKrashClient()` | `KrashClient` | provider state change (the value is not memoized) |
| `useKrashState()` | `KrashProviderState` | same |
| `useKrashGame()` | `{ client, snapshot: GameSnapshot }` | **any** store change |

### Utilities

| Hook | Returns | Description |
| `useMediaQuery(query)` | `boolean` | `matchMedia` match; **always `false` on the first render** |
| `useClickOutside(ref, handler, enabled?, excludeRefs?)` | `void` | `mousedown`/`touchstart` on document |

### Context hooks (see 12-contexts.md)

| Hook | Returns | Provider |
| `useDevice()` | `{ platform: Platform; isMobile; isDesktop; setPlatform }` | `DeviceProvider` |
| `useSettings()` | `{ settings: GameSettings; updateSetting; toggleSetting }` | `SettingsProvider` |
| `useCurrency()` | `{ currency: string; setCurrency }` | `CurrencyProvider` |
| `useGameConfigContext()` | `{ config: GameConfig; isLoaded; updateConfig; resetConfig }` | `GameConfigProvider` |
| `useLanguage()` | `{ language: Language; setLanguage; t: TFunction }` | `LanguageProvider` |

Every hook throws an error without `KrashProvider` (`useKrashClient must be used within a <KrashProvider>`); context hooks — without their own provider.

---

## Detailed Hook Reference

### `useKrashClient()` and `useKrashState()`

`packages/react/src/hooks/useKrashClient.ts`.
```
const client = useKrashClient();   // KrashClient — one instance for the provider's lifetime
const state  = useKrashState();    // KrashProviderState

```

`KrashProviderState` (`KrashProvider.tsx:14-23`):
```
interface KrashProviderState {
  client: KrashClient;
  launchStatus: KrashLaunchStatus;   // 'idle' | 'loading' | 'ready' | 'error' — string union, not the LaunchStatus enum
  session: LaunchSession | null;     // after launch
  launchError: string | null;
  isDemo: boolean;                   // session ? session.mode === 'demo' : launchService.isDemoMode(url)
  lobbyUrl: string | null;           // from the URL, read once on mount
  exitUrl: string | null;
  relaunchDemo: () => Promise<void>;
}

```

- The `client` reference is stable (`useRef`). `useEffect(..., [client])` deps are safe.
- `launchStatus` becomes `'ready'` when `client.launch()` resolves — that is the session exchange + the start of `connectionManager.connect()`, **not** JoinCrashOk. Catch the completion of login with `useConnectionStatus().state === 'connected'` or with the `'username'` event.
- On `'session-expired'` the provider sets `launchStatus='error'`, `session=null`, `launchError='Session rejected by server'` (`KrashProvider.tsx:118-124`); `onLaunchError` is **not** called here.
- When `renderError` is given, on error the children are **replaced** with the error UI (`KrashProvider.tsx:137-143`); without it the children remain.
- `relaunchDemo` sets `'ready'` before the reconnect completes (`:97-100`).

### `useKrashGame()`

```
const { client, snapshot } = useKrashGame();  // snapshot: GameSnapshot

```

`client.store.subscribe` — global. Re-render on every tick in FLYING. Only for a debug panel or a one-off read; in regular UI use granular hooks.

### `useBalance()`, `usePhase()`, `useMultiplier()`, `useCrashedAt()`

One-line `useStoreSlice` wrappers.

- `useBalance()` — `number`, initial `0`. Source: `'balance'` event (JoinCrashOk, BetPlaced, CashoutDone, CancelBetOk, keep-alive `Balance`). A free bet's bet does not change the wallet.
- `usePhase()` — `GamePhase`, initial `BETTING_OPEN` (until the server's first tick this is the default, not the real phase).
- `useMultiplier()` — every tick in FLYING (~100 ms); `1` on BETTING_OPEN (`GameEngine.ts:106-109`). For a Phaser counter `client.on('tick')` is better.
- `useCrashedAt()` — the crash multiplier on CRASHED, `null` on BETTING_OPEN.

### `useGameConfig()`

```
const config = useGameConfig();  // GameConfig | null — null until the GameConfig response arrives

```

`GameConfig` (`packages/sdk/src/types/betting.ts:91-113`; wire fields have the same camelCase names, `SfsProtocol.ts:479-505`):
```
interface GameConfig {
  minBet: number;
  maxBet: number;
  maxWinAmount: number;
  maxBetsPerUser: number;
  currencyCode: string;          // '' → 'USD'
  hasMoreOptions: boolean;
  currencyMinorUnits: number;    // 0 → 2
  clientConfig?: ClientConfig;   // only if configured for operator+game+currency
  configUpdatedAt?: number;      // epoch ms — config revision; comes together with clientConfig
}

interface ClientConfig {
  version: number;               // currently 1
  defaultBet: number;            // initial value of the bet input
  defaultAutoCashout: number;    // initial value of the auto-cashout input
  betStep?: number;              // step of the +/- buttons; when absent the reference implementation uses 1
  multiplyButton: ClientConfigButton;
  speedButtons: ClientConfigButton[];  // exactly 3
}

interface ClientConfigButton { key: string; title: string; value: number; }

```

`title` is for display only — do not parse it as a number; logic is on `value`. `GetGameConfig` is sent on LOGIN (`ConnectionManager.ts:317`), so the config usually arrives around JoinCrashOk. The reference implementation applies `defaultBet`/`defaultAutoCashout` only once, keyed on `configUpdatedAt` — do not overwrite the player's saved amount on every load.

### `useCurrencyMode()` and `useIsMultiCurrency()`

`packages/react/src/hooks/useCurrencyMode.ts`.
```
const mode = useCurrencyMode();          // 'single' | 'multi'; default 'single'
const isMulti = useIsMultiCurrency();    // mode === 'multi'

```

Server-driven: the top-level `currencyMode` field of JoinCrashOk (`ConnectionManager.ts:404-414`), on every (re)connect. It concerns the **other players' bet feed**: `'single'` — every row in one currency (compact), `'multi'` — each row with its own `currency`. Do not infer it from the currencies of `bet-update`s.

### `useBetLayout()`

```
const { layout, setLayout } = useBetLayout();  // BetLayout.Single | BetLayout.Double; default Double

```

`setLayout` → `client.setBetLayout` → persist (`krash.game_state:<username>:<gameId>`). The reference implementation always draws `Double` on mobile (UI policy).

### `useIsGameFrozen()`

`true` if no tick has arrived for 2000 ms after the first tick (`GameEngine.ts:15`, `FreezeDetector`). When frozen, `computeButtonVariant` sets every button to disabled (`buttonVariant.ts:31-36`).

### `useConnectionStatus()`

`packages/react/src/hooks/useConnectionStatus.ts`. If you write your own connection hook, do not reuse the SDK hook name — a same-named local hook makes imports ambiguous.
```
const { state, lagMs } = useConnectionStatus();
// state: 'connected' | 'disconnected' | 'checking'
// lagMs: the last 'ping-pong'.lagValue; initial 0

```

`'connected'` arrives twice (socket CONNECTION and JoinCrashOk), `'checking'` — between LOGIN and JoinCrashOk. "Ready for the game" = `'connected'` **after `'checking'`**; details in 07-events.

### `useHasActiveBets()`

`boolean` — some slot has a `Placed` or `Active` bet (`BettingEngine.ts:853-856`). A pending bet does not count. Use it to block layout switching or demo relaunch.

### `useWinDisplay()`

```
const { winAmount, winTimestamp, clearWin } = useWinDisplay();
// winAmount: number | null — payout of the last cashout; winTimestamp: Date.now() at cashout
// clearWin: () => client.clearWin()

```

Listens to two keys; caches the object (`useWinDisplay.ts:31-38`), so `useSyncExternalStore` sees a new reference only on a real change. On BETTING_OPEN the SDK resets it itself (`BettingEngine.ts:309-310`). On a simultaneous cashout on two slots only the last payout is shown — the UI must compute the sum itself from the `'cashout-done'`s.

### `useBetting(slot: BetSlot)`

```
const { slotState, placeBet, cashout, cancelBet, setBetAmount } = useBetting(BetSlot.Slot1);

slotState: SlotSnapshot;   // { bet, betInputAmount, hasPendingBet, betFailed, buttonVariant, isButtonDisabled, isSending }
placeBet: (amount: number, opts?: { autoCashoutAt?: number }) => void;   // client.placeBet
cashout: () => void;                                                     // client.cashout
cancelBet: () => void;                                                   // client.cancelBet
setBetAmount: (amount: number) => void;                                  // client.setBetInputAmount (persist)

```

Callbacks are memoized on `[client, slot]`. Bet semantics — 04-betting.md.

### `useBettingSlot(slot: BetSlot)`

`useBetting` + `useAutoPlay` in one object (`packages/react/src/hooks/useBettingSlot.ts`). Exported types: `BettingSlotReturn`, `AutoCashoutState`.
```
interface AutoCashoutState {
  enabled: boolean;                               // autoPlay.config.autoCashOut.enabled
  multiplier: number;                             // autoPlay.config.autoCashOut.multiplier
  onToggle: (enabled: boolean) => void;           // updateConfig({ autoCashOut: {...} })
  onMultiplierChange: (multiplier: number) => void;
  canChangeMultiplier: boolean;                   // !autoPlay.isActive
}

interface BettingSlotReturn {
  slotState: SlotSnapshot;
  onBet: (amount: number) => void;                // placeBet(amount, { autoCashoutAt }) — autoCashoutAt only when enabled
  onBetAmountChange: (amount: number) => void;    // setBetAmount
  cashout: () => void;
  cancelBet: () => void;
  autoCashout: AutoCashoutState;
  isAutoPlayActive: boolean;
  autoPlayRemainingRounds: number;                // engine.remainingRounds
  autoPlayConfig: AutoPlayConfig;
  onStartAutoPlay: () => void;                    // start(config.rounds || engine.totalRounds); no-op on 0
  onStopAutoPlay: () => void;                     // stop() → MANUAL_STOP
  updateAutoPlayConfig: (partial: Partial<AutoPlayConfig>) => void;
}

```

`onStartAutoPlay` needs the rounds set beforehand (`updateAutoPlayConfig({ rounds })` or `useAutoPlay().selectRounds`). This hook does not know about the free bet's `minCashout` — that is why the reference implementation does not use `useBettingSlot` and composes `useBetting`+`useAutoPlay` directly in its betting adapter hook.

### `useAutoPlay(slot: BetSlot)`

Details — 05-autoplay.md.
```
{
  config: AutoPlayConfig;
  isActive: boolean;
  currentRound: number;      // === remainingRounds (counts DOWN). engine.currentRound counts UP
  totalRounds: number;
  remainingRounds: number;
  roundOptions: number[];    // [20, 50, 100, 200]
  start: (rounds: number) => void;          // + notifyAutoPlayChanged; in BETTING_OPEN the first bet within 20 ms
  startAutoPlay: (rounds: number) => void;  // copy of start
  stop: (reason?: AutoPlayStopReason) => void;
  updateConfig: (partial: Partial<AutoPlayConfig>) => void;  // shallow merge + persist
  selectRounds: (rounds: number) => void;
  reset: () => void;         // autoCashOut stays; 'autoplay-stop' is not emitted
  onSetStartingBalance: () => void;  // no-op
}

```

Side effects: `start`/`stop` → `client.notifyAutoPlayChanged()` (button variant). Gotcha: `updateConfig` of another hook instance does not re-render this instance.

### `useFreerounds()`

`packages/react/src/hooks/useFreerounds.ts`; the `UseFreeroundsReturn` type is exported. Details — 11-freerounds.md.
```
interface UseFreeroundsReturn {
  state: FreeroundState | null;            // slice of the active grant; null if none is bound
  isActive: boolean;                       // state?.isActive ?? false  (status === 'IN_PROGRESS')
  grants: FreeroundGrant[];                // the server returns only AVAILABLE ones; the SDK updates locally
  history: FreeroundHistoryEntry[];        // the page of the last loadHistory
  lastCompleted: FreeroundSummaryPayload | null;  // trigger of the completed modal
  bind: (grantId: string) => void;         // client.bindFreeround
  unbind: () => void;                      // client.unbindFreeround
  refresh: () => void;                     // client.getFreerounds — a heavy request, on opening the picker
  loadHistory: (page?: number, pageSize?: number) => void;  // default 1, 10
  acknowledgeCompleted: () => void;        // lastCompleted → null; without this a second summary for the same grant is ignored
}

```

Read `kind`/`betMin`/`betMax`/`minCashout`/`balanceInitial` from `state` — the IN_PROGRESS grant may no longer be in `grants`.

### `useGameHistory()`

`packages/react/src/hooks/useGameHistory.ts`. If you write your own history hook, do not reuse the SDK hook name — the `@krash/react` `useGameHistory()` returns `{ items, fetch }`, and a same-named local hook makes imports ambiguous.
```
const { items, fetch } = useGameHistory();
// items: GameHistoryItem[] — { roundId, crashAt, fairnessHash, serverSeed, startTimeMs }
// fetch: (limit?: number) => client.getHistory(limit)   // default 50

```

**There is no cache.** Every hook instance starts with `[]` and only sees the subsequent `'game-history'` events. The SDK sends `GetHistory` once on JoinCrashOk (`ConnectionManager.ts:438`) — a component mounted later cannot catch it and must call `fetch()` itself. The list does not grow automatically on every crash — for that listen to the `'crash-history-item'` event and append it yourself (or `fetch()` again). Two instances = two separate states.

### `useMyBets()`

`packages/react/src/hooks/useMyBets.ts`. Module-level cache — on remount the last data is visible immediately (unlike `useGameHistory`).
```
const { rounds, total, fetch } = useMyBets();
// fetch: (limit?: number, offset?: number) => client.getMyHistory(limit, offset)  // default 50, 0

```

`MyHistoryPayload` (`packages/sdk/src/types/events.ts:241-259`):
```
interface MyHistoryPayload {
  rounds: Array<{
    roundId: string;          // `${roundId}-ticket-${j}` — each ticket is a separate entry
    timestamp: string;        // wire: ticket.createdAt
    totalBet: number;         // wire: ticket.betAmount
    totalWin: number;         // wire: ticket.winAmount
    crashMultiplier: number;  // wire: round.crashMultiplier
    bets: Array<{             // always exactly 1 element
      betType: string;        // 'freebet' | 'classic' — determined by the presence of freeround fields
      multiplier: number;     // winAmount / betAmount, 0 if not won (not the cashout multiplier from the wire)
      betAmount: number;
      netCash: number;        // === winAmount
      slot?: number;          // wire: ticket.slot (1/2); when absent, index+1
    }>;
  }>;
  total: number;   // pagination
  limit: number;
  offset: number;
}

```

Parse logic — `SfsProtocol.ts:524-607`. The SDK sends `GetMyHistory` itself on ROOM_JOIN (`ConnectionManager.ts:351`), so the cache is often already filled.

### `useMediaQuery(query: string)`

```
const isNarrow = useMediaQuery('(max-width: 699px)');

```

`useState(false)` + effect: **always `false` on the first render**, the real value arrives on the second render after the effect. To avoid a layout flash use `useDevice()` for the platform (sync initialisation); `useMediaQuery` — for orientation/hover.

### `useClickOutside(ref, handler, enabled?, excludeRefs?)`

```
const ref = useRef<HTMLDivElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);
const exclude = useMemo(() => [buttonRef], []);
useClickOutside(ref, () => setOpen(false), open, exclude);

```

Signature: `(ref: RefObject<T | null>, handler: (e: MouseEvent | TouchEvent) => void, enabled = true, excludeRefs?: RefObject<HTMLElement | null>[])`. `mousedown` + `touchstart` on `document`. Effect deps — `[ref, handler, enabled, excludeRefs]`: an inline `handler` or an inline `[ref1, ref2]` array re-registers the listener on every render. It works, but `useCallback`/`useMemo` is better. `enabled=false` → the listener is not attached.

---

## Exported types

`packages/react/src/index.ts`:

| Type | Source | What it is |
| `KrashProviderProps` | `KrashProvider.tsx` | `KrashConfig & { children, sfs2xModule, launchUrl?, onLaunched?, onLaunchError?, renderError? }` |
| `KrashProviderState` | `KrashProvider.tsx` | the return of `useKrashState()` (see above) |
| `KrashLaunchStatus` | `KrashProvider.tsx` | `'idle' \| 'loading' \| 'ready' \| 'error'` — string union |
| `KrashContext` | `KrashProvider.tsx` | `React.Context<KrashProviderState \| null>` — value export, for custom providers |
| `BettingSlotReturn`, `AutoCashoutState` | `hooks/useBettingSlot.ts` | above |
| `UseFreeroundsReturn` | `hooks/useFreerounds.ts` | above |
| `GameSettings` | `contexts/SettingsContext.tsx` | `{ sound: boolean; music: boolean; animation: boolean }` |
| `TFunction` | `contexts/LanguageContext.tsx` | `(key: string, options?: any) => string` |
| `Language` | `contexts/LanguageContext.tsx` | enum (value export) |

Plus `export * from '@krash/sdk'` — `KrashClient`, `BetSlot`, `GamePhase`, `BetButtonVariant`, `AutoPlayStopReason`, `Platform`, `GameEventMap`, every payload type, `detectPlatform` etc. One import is enough:
```
import { KrashProvider, useBetting, BetSlot, BetButtonVariant, type SlotSnapshot } from '@krash/react';

```

---

## Performance Tips

1. **Granular hooks.** `useBalance()` re-renders only on the `balance` key; `usePhase()` — only on the phase. Give a component only the slice it needs.
1. **Do not use `useKrashGame()` in a wide component** — it renders on every tick in FLYING.
1. **`useBetting(slot)` re-renders both slots together** on every `syncStore` (including the balance keep-alive, once every 5 seconds). This is cheap compared to the tick frequency, but wrap a heavy slot component in `React.memo` and pass the individual fields of `slotState` down as props.
1. **`useKrashClient()` consumers re-render on a provider state change** (the value is not memoized). After launch this is rare; if it still bothers you, do not subscribe to `KrashContext` directly — pass the client down as a prop.
1. **`useMultiplier()` only in the component** that draws the number. For Phaser/Canvas/sound use `client.on('tick')` — without the React cycle. The reference implementation's SDK→Phaser event bridge is an example of this (see 07-events).
1. `useGameHistory` — one instance in the app, spread the state via context or props; otherwise every instance keeps a separate copy and every `'game-history'` re-renders all of them at once.
 Made with  Material for MkDocs

