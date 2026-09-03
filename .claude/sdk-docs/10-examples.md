<!-- source: https://krash-sdk-docs.playcore.live/en/10-examples/ -->

# 10. Examples

All examples are on the current API and compile in `strict` TypeScript (`@krash/react` re-exports `@krash/sdk`, so a single import is enough). The hook return shapes are from `packages/react/src/hooks/`.

## Minimal skin

```
import * as SFS2X from 'sfs2x-api';
import {
  KrashProvider, useBalance, usePhase, useMultiplier, useBetting,
  BetSlot, GamePhase, BetButtonVariant,
} from '@krash/react';

export function App() {
  return (
    <KrashProvider apiBaseUrl="https://api.example.com" sfsHost="ws.example.com" sfs2xModule={SFS2X}>
      <Game />
    </KrashProvider>
  );
}

function Game() {
  const balance = useBalance();
  const phase = usePhase();
  const multiplier = useMultiplier();
  const { slotState, placeBet, cashout, cancelBet } = useBetting(BetSlot.Slot1);

  const onClick = () => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet:           placeBet(slotState.betInputAmount); break;
      case BetButtonVariant.Cashout:       cashout(); break;
      case BetButtonVariant.Cancel:
      case BetButtonVariant.CancelWaiting: cancelBet(); break;
      default: break;
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <h1>{phase === GamePhase.FLYING ? `${multiplier.toFixed(2)}x` : phase}</h1>
      <p>Balance: {balance}</p>
      <button onClick={onClick} disabled={slotState.isButtonDisabled}>
        {slotState.buttonVariant === BetButtonVariant.Cashout
          ? `Cashout ${multiplier.toFixed(2)}x`
          : slotState.buttonVariant}
      </button>
    </div>
  );
}

```

## Full skin — two slots + autoplay + history + freebets

```
import * as SFS2X from 'sfs2x-api';
import {
  KrashProvider, useBalance, usePhase, useMultiplier, useCrashedAt,
  useBetting, useAutoPlay, useBetLayout, useGameHistory, useMyBets,
  useConnectionStatus, useIsGameFrozen, useGameConfig, useFreerounds, useWinDisplay,
  BetSlot, BetLayout, GamePhase, BetButtonVariant,
} from '@krash/react';

export function App() {
  return (
    <KrashProvider
      apiBaseUrl="https://api.example.com"
      sfsHost="ws.example.com"
      sfs2xModule={SFS2X}
      onLaunched={(s) => console.log('Launched:', s.gameId, s.isDemo ? '(demo)' : '(real)')}
    >
      <GameLayout />
    </KrashProvider>
  );
}

function GameLayout() {
  const { layout, setLayout } = useBetLayout();
  const frozen = useIsGameFrozen();

  return (
    <div style={{ opacity: frozen ? 0.5 : 1 }}>
      <Header />
      <MultiplierDisplay />
      <WinToast />
      <FreeBetWidget />
      <BetPanel slot={BetSlot.Slot1} />
      {layout === BetLayout.Double && <BetPanel slot={BetSlot.Slot2} />}
      <button onClick={() => setLayout(layout === BetLayout.Single ? BetLayout.Double : BetLayout.Single)}>
        {layout === BetLayout.Single ? '+ Add slot' : '− Single'}
      </button>
      <History />
    </div>
  );
}

function Header() {
  const balance = useBalance();
  const { state, lagMs } = useConnectionStatus();
  const config = useGameConfig();

  return (
    <header>
      <span>Balance: {balance} {config?.currencyCode ?? ''}</span>
      <span> · {state} ({lagMs} ms)</span>
      {config && <span> · min {config.minBet} / max {config.maxBet}</span>}
    </header>
  );
}

function MultiplierDisplay() {
  const phase = usePhase();
  const multiplier = useMultiplier();
  const crashedAt = useCrashedAt();

  if (phase === GamePhase.CRASHED && crashedAt !== null) {
    return <h1 style={{ color: 'red' }}>{crashedAt.toFixed(2)}x</h1>;
  }
  if (phase === GamePhase.FLYING) {
    return <h1 style={{ color: 'green' }}>{multiplier.toFixed(2)}x</h1>;
  }
  return <h1>Waiting…</h1>;
}

function WinToast() {
  const { winAmount, winTimestamp, clearWin } = useWinDisplay();
  if (winAmount === null) return null;
  return (
    <div key={winTimestamp} onClick={clearWin}>
      You won {winAmount}
    </div>
  );
}

function BetPanel({ slot }: { slot: BetSlot }) {
  const { slotState, placeBet, cashout, cancelBet, setBetAmount } = useBetting(slot);
  const multiplier = useMultiplier();
  const autoPlay = useAutoPlay(slot);
  const config = useGameConfig();

  // UI validation — the SDK does not check min/max
  const clamp = (v: number) => {
    if (!config) return v;
    return Math.min(config.maxBet, Math.max(config.minBet, v));
  };

  const label = (): string => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet:           return `Bet ${slotState.betInputAmount}`;
      case BetButtonVariant.Cashout:       return `Cashout ${multiplier.toFixed(2)}x`;
      case BetButtonVariant.Cancel:        return slotState.isSending ? 'Sending…' : 'Cancel';
      case BetButtonVariant.CancelWaiting: return 'Cancel (next round)';
      case BetButtonVariant.CashingOut:    return 'Cashing out…';
      case BetButtonVariant.Lost:          return 'Lost';
      default:                             return '…';
    }
  };

  const action = () => {
    switch (slotState.buttonVariant) {
      case BetButtonVariant.Bet:
        placeBet(clamp(slotState.betInputAmount), {
          autoCashoutAt: autoPlay.config.autoCashOut.enabled ? autoPlay.config.autoCashOut.multiplier : undefined,
        });
        break;
      case BetButtonVariant.Cashout:
        cashout();
        break;
      case BetButtonVariant.Cancel:
      case BetButtonVariant.CancelWaiting:
        cancelBet();
        if (autoPlay.isActive) autoPlay.stop();
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ border: '1px solid #333', padding: 16, margin: 8 }}>
      <h3>Slot {slot + 1}</h3>
      <input
        type="number"
        value={slotState.betInputAmount}
        onChange={(e) => setBetAmount(clamp(Number(e.target.value) || 0))}
      />
      <button onClick={action} disabled={slotState.isButtonDisabled}>
        {label()}
      </button>
      {slotState.hasPendingBet && <span> (queued)</span>}
      {slotState.betFailed && <span style={{ color: 'red' }}> Bet not confirmed</span>}

      {autoPlay.isActive ? (
        <div>
          {/* currentRound === remainingRounds — counts down; no separate subtraction needed */}
          Auto: {autoPlay.remainingRounds}/{autoPlay.totalRounds} left
          <button onClick={() => autoPlay.stop()}>Stop</button>
        </div>
      ) : (
        <select
          value={autoPlay.config.rounds}
          onChange={(e) => autoPlay.selectRounds(Number(e.target.value))}
        >
          <option value={0}>Auto: off</option>
          {autoPlay.roundOptions.map((n) => <option key={n} value={n}>{n} rounds</option>)}
        </select>
      )}
      {!autoPlay.isActive && autoPlay.config.rounds > 0 && (
        <button onClick={() => autoPlay.start(autoPlay.config.rounds)}>Start auto</button>
      )}
    </div>
  );
}

function FreeBetWidget() {
  const fb = useFreerounds();

  return (
    <div>
      {fb.isActive && fb.state && (
        <div style={{ background: 'gold', padding: 8 }}>
          Free bet active: {fb.state.balanceRemaining}/{fb.state.balanceInitial} remaining
          (min cashout {fb.state.minCashout}x)
          <button onClick={fb.unbind}>Stop</button>
        </div>
      )}

      {!fb.isActive && fb.grants.filter((g) => g.status === 'AVAILABLE').map((g) => (
        <button key={g.grantId} onClick={() => fb.bind(g.grantId)}>
          Use free bet ({g.kind === 'fixed'
            ? `${g.betAmount} × ${Math.floor(g.balanceRemaining / g.betAmount)}`
            : `${g.betMin}–${g.betMax}, balance ${g.balanceRemaining}`})
        </button>
      ))}

      {fb.lastCompleted && (
        <div onClick={fb.acknowledgeCompleted}>
          Free bet {fb.lastCompleted.reason ?? 'COMPLETED'} — total win {fb.lastCompleted.totalWin}
        </div>
      )}
    </div>
  );
}

function History() {
  const { items, fetch } = useGameHistory();
  const { rounds, fetch: fetchBets } = useMyBets();

  return (
    <div>
      <h3>Crash history</h3>
      <button onClick={() => fetch(10)}>Load</button>
      {items.slice(0, 10).map((item) => (
        <span key={item.roundId} style={{ color: item.crashAt >= 2 ? 'green' : 'red', margin: 4 }}>
          {item.crashAt.toFixed(2)}x
        </span>
      ))}

      <h3>My bets</h3>
      <button onClick={() => fetchBets(10)}>Load</button>
      {rounds.map((r) => (
        <div key={r.roundId}>
          {r.timestamp}: bet {r.totalBet} → win {r.totalWin} (crash {r.crashMultiplier.toFixed(2)}x)
          {r.bets.map((b, i) => (
            <span key={i}> [{b.betType} {b.betAmount} @ {b.multiplier}x → {b.netCash}]</span>
          ))}
        </div>
      ))}
    </div>
  );
}

```

Notes: - `useAutoPlay().currentRound` **equals** `remainingRounds` (both count down, `packages/react/src/hooks/useAutoPlay.ts:90-92`). `totalRounds - currentRound` is **wrong** here — it gives you the rounds "played". The engine's `AutoPlayState.currentRound` counts up — that is a different field. - `useGameHistory` is from `@krash/react` (`{ items, fetch }`, it does **not** mix in `'crash-history-item'`). If you write your own history hook, do not reuse the SDK hook's name — a same-named local hook makes imports ambiguous. - min/max clamp, insufficient balance, freebet range clamp, `minCashout` — the UI's job (04 — UI must do itself). - In `fb.grants` the server returns **only AVAILABLE** grants; the active grant is in `fb.state`.

## Raw event subscription (Phaser/Canvas)

```
import { useEffect } from 'react';
import { useKrashClient } from '@krash/react';

export function PhaserBridge({ scene }: { scene: Phaser.Scene }) {
  const client = useKrashClient();

  useEffect(() => {
    const offTick = client.on('tick', ({ multiplier, remainingMs }) => {
      scene.events.emit('sfs:tick', multiplier, remainingMs);
    });
    const offCrash = client.on('crash', ({ multiplier }) => {
      scene.events.emit('sfs:crash', multiplier);
    });
    const offPhase = client.on('phase-change', ({ phase, roundId }) => {
      scene.events.emit('sfs:phase-change', phase, roundId);
    });
    return () => { offTick(); offCrash(); offPhase(); };
  }, [client, scene]);

  return null;
}

```

The reference implementation's bridge forwards ~18 events to its own `EventBus` (`EventBus` — the app's local `Phaser.Events.EventEmitter`) and emits `sfs:crash-state {crashed}` with a 100 ms reset; the Phaser scene there consumes the phase change, not the ticks.

## Vanilla JS (without React)

```
import * as SFS2X from 'sfs2x-api';
import { KrashClient, BetSlot, BetButtonVariant } from '@krash/sdk';

const client = new KrashClient({
  apiBaseUrl: 'https://api.example.com',
  sfsHost: 'ws.example.com',
  gameId: 'your_game',
});

const betBtn = document.querySelector<HTMLButtonElement>('#bet-btn');
const balanceEl = document.querySelector<HTMLElement>('#balance');
if (!betBtn || !balanceEl) {
  throw new Error('Missing #bet-btn / #balance in DOM');
}

client.store.subscribeToKey('balance', () => {
  balanceEl.textContent = String(client.store.getSlice('balance'));
});

client.store.subscribeToSlot(BetSlot.Slot1, () => {
  const s = client.store.getSlice('slots')[BetSlot.Slot1];
  betBtn.disabled = s.isButtonDisabled;
  betBtn.textContent = s.buttonVariant;
});

betBtn.addEventListener('click', () => {
  const s = client.store.getSlice('slots')[BetSlot.Slot1];
  switch (s.buttonVariant) {
    case BetButtonVariant.Bet:           client.placeBet(BetSlot.Slot1, s.betInputAmount); break;
    case BetButtonVariant.Cashout:       client.cashout(BetSlot.Slot1); break;
    case BetButtonVariant.Cancel:
    case BetButtonVariant.CancelWaiting: client.cancelBet(BetSlot.Slot1); break;
    default: break;
  }
});

client.on('phase-change', ({ phase }) => document.body.dataset.phase = phase);
client.on('freeround-summary', (summary) => console.log('Free bet done:', summary.totalWin));
client.on('session-expired', () => alert('Session expired'));

window.addEventListener('beforeunload', () => client.destroy());

await client.launch(SFS2X, window.location.href);

```

`querySelector` returns `null` if the element is missing — under `strictNullChecks` the guard is mandatory. Set up the store subscriptions before `launch()` so you do not miss the first `balance`/`slots` sync. Full vanilla reference (including autoplay) — 16-krashclient-api.

## Full example — reference implementation

The reference implementation — Phaser + Spine, i18n, the full freebet flow, sound. Detailed architecture discussion — 14-reference-implementation.

