<!-- source: https://krash-sdk-docs.playcore.live/en/15-integration-checklist/ -->

# 15. Integration checklist (React + Vite)

A step-by-step path from an empty Vite project to a production skin. Each step says what belongs to the SDK and what is yours, and points to the `docs/panels/` chapter where the full reference implementation and the edge cases are. The snippets match the current API.

## 0. Prerequisites (backend)

The SDK expects three REST endpoints and one SFS2X zone:

| Endpoint | Method | Body / query | Header | SDK |
| `/seamless/session/exchange` | `POST` | `{ "one_shot_token": "<t>" }` | — | `LaunchService.ts:192-198` |
| `/seamless/launch/demo` | `GET` | `?gameId&lang&platform&currencyCode&userId` | — | `LaunchService.ts:229-246` |
| `/seamless/session/recovery/bets` | `GET` | `?roundId=` | `X-Game-Session-Token` | `BetRecoveryService.ts:48-53` |

SFS2X: host (`sfsHost`), port `443` + SSL (default), zone `BasicExamples` (default, `sfsZone`), login `LoginRequest('session_token', '', { token }, zone)`, extension `cmd`s — 17-wire-protocol.

- [ ] `apiBaseUrl`, `sfsHost`, `gameId` are known.
- [ ] The launch URL format is agreed: `?t=&gid=&lang=&platform=&currency=&lobbyUrl=&exitUrl=` (`types/launch.ts:8-25`).

## 1. Vite project + env typing

```
pnpm create vite my-skin --template react-ts
cd my-skin
pnpm add @krash/sdk @krash/react sfs2x-api

```

`sfs2x-api` — a **required** peer dependency of `@krash/sdk`; the SDK does not import it itself, you pass it via the `sfs2xModule` prop.
```
// src/vite-env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SFS_HOST: string;
  readonly VITE_GAME_ID: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }

```

```
# .env
VITE_API_BASE_URL=https://api.example.com
VITE_SFS_HOST=sfs.example.com
VITE_GAME_ID=my_game

```

- [ ] `pnpm dev` opens an empty app; `import.meta.env.VITE_*` is typed.

## 2. Provider stack

```
// src/main.tsx
import { createRoot } from 'react-dom/client';
import * as SFS2X from 'sfs2x-api';
import {
  KrashProvider, CurrencyProvider, LanguageProvider,
  SettingsProvider, GameConfigProvider, DeviceProvider,
} from '@krash/react';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <KrashProvider
    apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
    sfsHost={import.meta.env.VITE_SFS_HOST}
    gameId={import.meta.env.VITE_GAME_ID}
    sfs2xModule={SFS2X}
    onLaunched={s => console.log('launched', s.gameId, s.isDemo)}
    onLaunchError={e => console.error(e)}
    renderError={(error, lobbyUrl) => <ErrorScreen error={error} lobbyUrl={lobbyUrl} />}
  >
    <CurrencyProvider>
      <LanguageProvider>
        <SettingsProvider>
          <GameConfigProvider>
            <DeviceProvider>
              <App />
            </DeviceProvider>
          </GameConfigProvider>
        </SettingsProvider>
      </LanguageProvider>
    </CurrencyProvider>
  </KrashProvider>,
);

function ErrorScreen({ error, lobbyUrl }: { error: string; lobbyUrl: string | null }) {
  return (
    <div>
      <h2>Session expired</h2>
      <p>{error}</p>
      {lobbyUrl && /^https?:/.test(lobbyUrl) && <a href={lobbyUrl}>Back to lobby</a>}
    </div>
  );
}

```

- `renderError` **replaces** the children on `launchStatus === 'error'` (`KrashProvider.tsx:137-143`); `onLaunchError` is **not** called on `session-expired`.
- `SettingsProvider`/`LanguageProvider`/`CurrencyProvider` must be inside `KrashProvider`.
- With i18next: `<LanguageProvider t={t} changeLanguage={l => i18n.changeLanguage(l)}>` (see chapter 14 §Provider stack).
- [ ] `[Krash SDK] v...` and `launched` appear in the console. → panels/01

## 3. Loader gate

The children are rendered during `idle`/`loading` too — the gate is your job:
```
import { useKrashState } from '@krash/react';

export default function App() {
  const { launchStatus } = useKrashState();
  if (launchStatus !== 'ready') return <Loader />;
  return <Game />;
}

```

The reference implementation does not check `launchStatus` — its `MainLoader` waits for three events (server-connected, `ready`, the canvas's first frame) with a 15 s fallback. `relaunchDemo()` sets `ready` before the reconnect finishes.

- [ ] The loader is shown during exchange + SFS login, then the game. → panels/01

## 4. Basic UI: balance, phase, one slot

The SDK returns 6 variants: `Bet`, `Cashout`, `Cancel`, `CancelWaiting`, `CashingOut`, `Lost`. `Sending`/`Cancelling`/`Freebet` are in the enum, but `computeButtonVariant` does not produce them — do not write cases for them.
```
import { useBalance, usePhase, useMultiplier, useBetting, BetSlot, BetButtonVariant, GamePhase } from '@krash/react';

export function Slot({ slot }: { slot: BetSlot }) {
  const balance = useBalance();
  const phase = usePhase();
  const multiplier = useMultiplier();
  const { slotState, placeBet, cashout, cancelBet, setBetAmount } = useBetting(slot);

  const label: Record<BetButtonVariant, string> = {
    [BetButtonVariant.Bet]: 'Bet',
    [BetButtonVariant.Cashout]: `Cashout ${((slotState.bet?.amount ?? 0) * multiplier).toFixed(2)}`,
    [BetButtonVariant.Cancel]: 'Cancel',
    [BetButtonVariant.CancelWaiting]: 'Cancel (next round)',
    [BetButtonVariant.CashingOut]: 'Cashing out…',
    [BetButtonVariant.Lost]: 'Lost',
    [BetButtonVariant.Sending]: 'Bet',      // never produced by SDK
    [BetButtonVariant.Cancelling]: 'Cancel', // never produced by SDK
    [BetButtonVariant.Freebet]: 'Bet',      // never produced by SDK
  };

  const onClick = () => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet: placeBet(slotState.betInputAmount); break;
      case BetButtonVariant.Cashout: cashout(); break;
      case BetButtonVariant.Cancel:
      case BetButtonVariant.CancelWaiting: cancelBet(); break;
    }
  };

  return (
    <div>
      <p>Balance {balance} · {phase} {phase === GamePhase.FLYING && `${multiplier.toFixed(2)}x`}</p>
      <input type="number" value={slotState.betInputAmount} onChange={e => setBetAmount(Number(e.target.value))} />
      <button disabled={slotState.isButtonDisabled} onClick={onClick}>{label[slotState.buttonVariant]}</button>
      {slotState.betFailed && <small>Bet failed (no server ACK)</small>}
    </div>
  );
}

```

- `betFailed` = the `BetPlaced` ACK did not arrive before FLYING (5000 ms), cleared after 3000 ms — not a server rejection (`bet-error` is not reflected in the slot).
- In BETTING_CLOSING/FLYING `placeBet` goes into the pending queue and is sent on the next BETTING_OPEN; `CancelWaiting` cancels it.
- There is no balance check in the SDK — compare before `placeBet` yourself (the reference implementation → `openCashier()`).
- [ ] In a demo session a bet is placed, cashout works, cancel works. → panels/05, panels/06, panels/03

## 5. Double slot

```
import { useBetLayout, BetLayout, BetSlot } from '@krash/react';

export function Slots() {
  const { layout, setLayout } = useBetLayout();
  const slots = layout === BetLayout.Double ? [BetSlot.Slot1, BetSlot.Slot2] : [BetSlot.Slot1];
  return (
    <>
      {slots.map(s => <Slot key={s} slot={s} />)}
      <button onClick={() => setLayout(layout === BetLayout.Double ? BetLayout.Single : BetLayout.Double)}>
        {layout === BetLayout.Double ? '−' : '+'}
      </button>
    </>
  );
}

```

Default `Double`; persisted in `krash.game_state:<username>:<gameId>`. Closing slot 2 with an active/pending bet or autoplay — block it yourself (the reference implementation does this in the slot toggle handler). On mobile the reference implementation always shows both.

- [ ] Two independent bets in one round. → panels/08

## 6. Autoplay + auto-cashout

```
import { useAutoPlay, BetSlot } from '@krash/react';

export function AutoPlay({ slot }: { slot: BetSlot }) {
  const ap = useAutoPlay(slot);
  return ap.isActive ? (
    <button onClick={() => ap.stop()}>Stop ({ap.remainingRounds}/{ap.totalRounds})</button>
  ) : (
    <>
      <label>
        <input
          type="checkbox"
          checked={ap.config.autoCashOut.enabled}
          onChange={e => ap.updateConfig({ autoCashOut: { ...ap.config.autoCashOut, enabled: e.target.checked } })}
        /> auto-cashout @ {ap.config.autoCashOut.multiplier}x
      </label>
      <button onClick={() => ap.start(20)}>Start 20</button>
    </>
  );
}

```

- `currentRound === remainingRounds` (counts down); stop conditions are evaluated only on BETTING_OPEN; `ERROR` only on `balance <= 0`.
- Auto-cashout goes to the server via `placeBet(amount, { autoCashoutAt })` — pass it on manual bets too if the toggle is on (the reference implementation's adapter hook does this).
- [ ] 20 rounds are placed and it stops; auto-cashout happens on the server. → panels/07

## 7. Freebets

```
import { useFreerounds } from '@krash/react';

export function FreeBets() {
  const fb = useFreerounds();

  if (fb.isActive && fb.state) {
    const s = fb.state;
    // X/Y badge: range → amount, fixed → number of bets
    const x = s.kind === 'range' ? s.balanceRemaining : Math.floor(s.balanceRemaining / s.betAmount + 1e-9);
    const y = s.kind === 'range' ? s.balanceInitial   : Math.floor(s.balanceInitial   / s.betAmount + 1e-9);
    return (
      <div>
        Free bet {x}/{y} · min cashout {s.minCashout}x
        {s.kind === 'range' && ` · bet ${s.betMin}–${s.betMax}`}
        <button onClick={fb.unbind}>Stop</button>
      </div>
    );
  }

  return (
    <>
      <ul>
        {fb.grants.filter(g => g.status === 'AVAILABLE').map(g => (
          <li key={g.grantId}>
            {g.kind === 'fixed' ? `${Math.floor(g.balanceInitial / g.betAmount + 1e-9)} × ${g.betAmount}` : `${g.balanceInitial} (${g.betMin}–${g.betMax})`}
            <button onClick={() => fb.bind(g.grantId)}>Activate</button>
          </li>
        ))}
      </ul>
      {fb.lastCompleted && (
        <div role="dialog">
          Free bet finished — win {fb.lastCompleted.totalWin} ({fb.lastCompleted.reason ?? 'COMPLETED'})
          <button onClick={fb.acknowledgeCompleted}>OK</button>
        </div>
      )}
    </>
  );
}

```

**Your responsibility** (the SDK does not do this): clamping the range amount to `[betMin, min(betMax, balanceRemaining)]`; blocking cashout below `minCashout`; locking the input on a fixed grant; locking slot 2 on the last freebet; `acknowledgeCompleted()` when the modal closes (otherwise `lastCompleted` stays). `freeround-summary` may arrive before `freeround-completed`; EXPIRED/CANCELLED have no `freeround-completed`. `DEFAULT_MIN_CASHOUT = 1.01`.

- [ ] The grant is visible, bind/unbind, the bet goes with the grantId (Network: `PlaceBet` `freeround_grant_id`), completion modal, autoplay stops on exhaustion. → panels/09, 11-freerounds

## 8. History

```
import { useEffect } from 'react';
import { useGameHistory, useMyBets, useKrashClient } from '@krash/react';

export function History() {
  const client = useKrashClient();
  const { items, fetch: fetchHistory } = useGameHistory(); // the SDK requests 50 itself on JoinCrashOk
  const { rounds, total, fetch: fetchMine } = useMyBets();

  useEffect(() => { fetchMine(50, 0); }, [fetchMine]);
  // useGameHistory does not listen to crash-history-item — refetch after a crash
  useEffect(() => client.on('crash-history-item', () => fetchHistory(50)), [client, fetchHistory]);

  return (
    <>
      <ul>{items.map(i => <li key={i.roundId}>{i.crashAt.toFixed(2)}x</li>)}</ul>
      <p>My rounds: {total}</p>
      <ul>{rounds.map(r => <li key={r.roundId}>{r.crashMultiplier}x · bet {r.totalBet} · win {r.totalWin}</li>)}</ul>
    </>
  );
}

```

`my-history` also arrives automatically on ROOM_JOIN; refreshing after cashout/crash is your job. `useMyBets` keeps a module-level cache, `useGameHistory` does not.

- [ ] Crash history + my bets are shown and updated. → panels/04, panels/10, panels/12, panels/11 (`bet-update` feed)

## 9. Connection UX

`useConnectionStatus()` → `{ state: 'connected' | 'disconnected' | 'checking', lagMs }`, `useIsGameFrozen()`. `connected` arrives twice (socket + `JoinCrashOk`); the initial `state` is `'disconnected'` — show the overlay after `launchStatus === 'ready'`. Reload = `window.location.reload()` (not `relaunchDemo()` in real-money). Full example — panels/15.

- [ ] Overlay when Wi-Fi is turned off, reconnect and bet recovery (`round-my-bets`) when it is turned on; frozen indicator on a server pause.

## 10. Demo mode

Demo = `mode=demo` in the URL **or** no `t=` (`LaunchService.ts:60-62`). The SDK adds `mode=demo` to the URL for refresh. On a login failure in demo, the SDK tries a relaunch once itself.
```
import { useKrashState } from '@krash/react';

export function DemoBadge() {
  const { isDemo, relaunchDemo } = useKrashState();
  if (!isDemo) return null;
  return <button onClick={() => void relaunchDemo()}>DEMO — new session</button>;
}

```

- [ ] Both `?mode=demo` and a URL without a token open demo. → panels/02

## 11. Canvas / visuals (optional)

The SDK does not need Phaser. `client.on('phase-change')` + `client.on('crash')` are enough for the animation; `tick` — if you want the multiplier on the canvas. The reference implementation's scene consumes only `phase-change`, the multiplier is in the DOM. A generic bridge + renderer-agnostic handler — panels/16.

- [ ] The visuals change on a phase change; no 0×0 init happens in an iframe.

## 12. Sound (optional)

`useSettings().settings.sound/music`; the SDK does not play sound. The click sound from the handler, crash/cashout — from the `phase-change`/`cashout-done` events. Because of the autoplay block, `play()` rejects before a user gesture — catch it. → panels/14

- [ ] The sound toggle is kept across refresh (`krash.settings:<sessionToken>`), `?extraParams={"sound":false}` works.

## 13. i18n

```
pnpm add i18next react-i18next

```

```
import { useTranslation } from 'react-i18next';
import { LanguageProvider } from '@krash/react';

export function I18nBridge({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  return <LanguageProvider t={t} changeLanguage={lang => i18n.changeLanguage(lang)}>{children}</LanguageProvider>;
}

```

The SDK reads/writes `?lang=` (removes the param on EN) and listens to `popstate`; the resources are yours. The reference implementation — 12 languages.

- [ ] `?lang=ka` → Georgian UI; changing the language updates the URL. → 12-contexts

## 14. Mobile

`useDevice().isMobile` (UA | coarse pointer | width < 700; the URL `?platform=` is only a hint). Portrait lock, popups, custom keyboard (`readOnly` + `inputMode="none"`), `--real-vh` — panels/17.

- [ ] On iOS Safari the layout does not "jump" on the keyboard; landscape overlay; both slots are visible.

## 15. Build & deploy

`vite.config.ts` — the reference implementation's config: `manualChunks` is a **function**, its own precompress plugin (`vite-plugin-compression` is **not** used):
```
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/]sfs2x-api[\\/]/.test(id)) return 'vendor-sfs';
          // Phaser/Pixi → 'vendor-game', i18next → 'vendor-i18n' — if you use them
          return undefined;
        },
      },
    },
  },
});

```

Pre-compression: the reference implementation's `precompressAssets()` plugin creates `.gz`/`.br` siblings on `closeBundle` with `node:zlib` — copy it or install `vite-plugin-compression`. nginx: `gzip_static on` + on-the-fly `gzip on`, `/assets/` `expires 1y; Cache-Control "public, immutable"`, `try_files $uri /index.html`, `index.html` `no-cache` (no `brotli_static` — nginx:alpine has no brotli module). Docker: multi-stage `node:22` → `nginx:alpine`, `VITE_*` as `ARG`s at build time — 14 §Build.

- [ ] `pnpm build` → `dist/` with vendor chunks; after deploy a refresh works on any route.

## 16. Smoke test (before deploy)

- [ ] Real token (`?t=`) → login, the balance is correct.
- [ ] `?mode=demo` and no token → demo.
- [ ] Single: place → cashout; place → cancel; place in BETTING_CLOSING → pending → placed in the next round; `CancelWaiting` cancels it.
- [ ] Double: both slots separately; closing slot 2 with a bet is blocked.
- [ ] Autoplay 20 rounds, manual stop, stop via a stop condition, auto-cashout on the server.
- [ ] Freebet fixed: bind → bet with `betAmount` → X/Y decreases → completion → `acknowledgeCompleted`.
- [ ] Freebet range: clamp works; the last freebet goes to slot 1.
- [ ] Freebet + autoplay: `FREEROUND_COMPLETED` stop on exhaustion.
- [ ] Wi-Fi off → overlay; on → reconnect, `round-my-bets` restores the active bet.
- [ ] Login timeout (invalid token) → `renderError` screen, `lobbyUrl` link.
- [ ] Refresh mid-game: the session is restored, the bet input/layout are restored, **the pending bet — not** (the SDK does not store it).
- [ ] History + my bets + live feed are updated after a crash.
- [ ] `?lang=` 2+ languages; `?currency=` is shown.
- [ ] Mobile portrait/landscape, iOS Safari keyboard.
- [ ] `exitUrl` → close button; `lobbyUrl` → link on the error screen; `postMessage('openCashier')` reaches the host.
- [ ] `[Krash SDK] v...` once in the console; verbose log with `?debug=1`.

## 17. Common issues

| Symptom | Cause | Solution |
| `Cannot find module 'sfs2x-api'` | peer dep missing | `pnpm add sfs2x-api`; `sfs2xModule={SFS2X}` |
| `useX must be used within a <KrashProvider>` | hook outside the provider | `SettingsProvider`/`LanguageProvider` inside `KrashProvider` |
| "connection lost" overlay during the loader | initial `connectionState = 'disconnected'` | `launchStatus === 'ready'` guard |
| Session expired immediately on a real token | the token is already used (one-shot) or login timeout 10 s | a new `t=`; SFS host/zone |
| `renderError` is not shown, `onLaunchError` is not called | `session-expired` only changes the state | `useKrashState().launchStatus === 'error'` or `renderError` |
| Bet button `Freebet`/`Sending` case never | the SDK does not produce these variants | map it in the UI: `isFreeBet && variant === Bet` → freebet style |
| `betFailed` is not shown on a server rejection | `betFailed` = ACK timeout; `bet-error` is not in the slot | `client.on('bet-error')` separately |
| A freebet bet goes with the user's amount on range | the SDK does not clamp range | clamp in the UI before `placeBet` |
| The completion modal twice / does not close | `acknowledgeCompleted()` was not called | call it on close |
| Limits/rules with empty numbers | `GameConfigProvider` is inert | `updateConfig(useGameConfig())` or `useGameConfig()` directly (`null` check) |
| Statistics go back to 50 after reconnect | the SDK requests 50 on `JoinCrashOk` | `fetch(limit)` on `connected` |
| The bet input is lost on refresh | key `krash.game_state:<username>:<gameId>` — no persist before the `username` event | make sure `username` arrives after login; other users' keys are not deleted |
| The pending bet disappeared on refresh | the SDK does not restore pending/active bets from localStorage | `round-my-bets` restores only confirmed ones from the server |
| A real-money user ended up in demo on Reload | `relaunchDemo()` opens demo for everyone | `window.location.reload()` |
| Desktop layout on mobile | the `?platform=desktop` hint is ignored in favour of runtime detection — or vice versa | trust `useDevice().isMobile` |
| Phaser WebGL framebuffer error in an iframe | init in a 0×0 container | deferred init ≥ 64 px |
| Chunk size warning | Phaser ~700 KiB | `chunkSizeWarningLimit: 1200` |

## 18. Resources

- 14-reference-implementation — the reference implementation map and the panels index.
- 06-hooks-reference, 07-events, 17-wire-protocol.
- 11-freerounds, 13-connection-and-protocol.

