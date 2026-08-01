import { EventBus } from "./EventBus";
import { GameEvent } from "./events";
import type { BetPlacedPayload, CancelBetOkPayload } from "./events";
import { INITIAL_GRANTS, isStakeable, remainingOf } from "./freeBets";
import type { FreeBetGrant } from "./freeBets";

/**
 * Reactive store for the player's free bets, read through
 * `useSyncExternalStore` like {@link gameStore} and {@link settingsStore}.
 *
 * One grant is staked at a time and both slots share it: the selection is a
 * wallet choice ("what am I betting with"), not a per-slot setting. The count
 * is spent on placement rather than on settlement — a placed bet has already
 * cost a ticket, which is why cancelling gives it back and cashing out does
 * not.
 */

export interface FreeBetSnapshot {
  grants: readonly FreeBetGrant[];
  /** The staked grant, or null when the player is betting real money. */
  activeId: string | null;
  /** Bets left across every stakeable grant. */
  totalRemaining: number;
}

const listeners = new Set<() => void>();

function build(
  grants: readonly FreeBetGrant[],
  activeId: string | null,
): FreeBetSnapshot {
  return {
    grants,
    activeId,
    totalRemaining: grants
      .filter((grant) => grant.price != null)
      .reduce((sum, grant) => sum + remainingOf(grant), 0),
  };
}

// Every session opens on real money. Staking a grant is a deliberate act, and
// a remembered one would have the player betting a gift they never re-chose.
let snapshot: FreeBetSnapshot = build(INITIAL_GRANTS, null);

function notify() {
  for (const listener of listeners) listener();
}

function patch(grants: readonly FreeBetGrant[], activeId: string | null) {
  snapshot = build(grants, activeId);
  notify();
}

/** Moves `used` by `delta`, keeping it inside the granted total. */
function spend(id: string, delta: number) {
  const grants = snapshot.grants.map((grant) =>
    grant.id === id
      ? {
          ...grant,
          used: Math.min(grant.total, Math.max(0, grant.used + delta)),
        }
      : grant,
  );

  // A grant with nothing left cannot stay staked — the next round would have
  // no ticket to spend, and the bet area would offer a bet it can't place.
  const active = grants.find((grant) => grant.id === snapshot.activeId);
  const activeId = active && isStakeable(active) ? snapshot.activeId : null;

  patch(grants, activeId);
}

function onBetPlaced({ freeBetId }: BetPlacedPayload) {
  if (freeBetId) spend(freeBetId, 1);
}

function onCancelBetOk({ freeBetId }: CancelBetOkPayload) {
  if (freeBetId) spend(freeBetId, -1);
}

let connected = false;

export const freeBetStore = {
  /** Attach engine listeners. Idempotent; returns a disconnect function. */
  connect(): () => void {
    if (connected) return () => freeBetStore.disconnect();
    connected = true;
    EventBus.on(GameEvent.BetPlaced, onBetPlaced);
    EventBus.on(GameEvent.CancelBetOk, onCancelBetOk);
    return () => freeBetStore.disconnect();
  },

  disconnect() {
    connected = false;
    EventBus.off(GameEvent.BetPlaced, onBetPlaced);
    EventBus.off(GameEvent.CancelBetOk, onCancelBetOk);
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot: (): FreeBetSnapshot => snapshot,

  /** The grant behind an id, for callers holding one from a placed bet. */
  getGrant(id: string): FreeBetGrant | undefined {
    return snapshot.grants.find((grant) => grant.id === id);
  },

  /** Stakes a grant, or clears the selection to bet real money again. */
  select(id: string | null) {
    if (id === snapshot.activeId) return;
    const grant = id === null ? null : freeBetStore.getGrant(id);
    if (id !== null && (!grant || !isStakeable(grant))) return;
    patch(snapshot.grants, id);
  },
};
