import { GameEvent } from "./events";

/**
 * Tiny typed event emitter used as the React ↔ Phaser ↔ engine bridge.
 *
 * It is a plain vanilla emitter (not `Phaser.Events.EventEmitter`) on purpose:
 * many React modules import the bus, and reusing Phaser's emitter would pull
 * the whole Phaser bundle into the main chunk and prevent lazy-loading it.
 *
 * Mirrors the small slice of the Phaser / eventemitter3 API this app relies on:
 * `on` / `once` / `off` / `removeAllListeners` / `emit`, with an optional
 * `context` so a Phaser scene method keeps its `this` binding.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args: any[]) => void;

interface ListenerEntry {
  fn: Listener;
  context: unknown;
  once: boolean;
}

class TinyEventEmitter {
  private readonly listeners = new Map<string, ListenerEntry[]>();

  on(event: string, fn: Listener, context?: unknown): this {
    return this.addListener(event, fn, context, false);
  }

  once(event: string, fn: Listener, context?: unknown): this {
    return this.addListener(event, fn, context, true);
  }

  off(event: string, fn?: Listener, context?: unknown): this {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }
    const list = this.listeners.get(event);
    if (!list) return this;
    const remaining = list.filter((entry) => {
      const fnMatches = entry.fn === fn;
      const contextMatches =
        context === undefined ? true : entry.context === context;
      return !(fnMatches && contextMatches);
    });
    if (remaining.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, remaining);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event === undefined) {
      this.listeners.clear();
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const list = this.listeners.get(event);
    if (list === undefined || list.length === 0) return false;
    // Snapshot before iterating: handlers may subscribe / unsubscribe mid-dispatch.
    const snapshot = list.slice();
    let firedOnce = false;
    for (const entry of snapshot) {
      if (entry.context !== undefined) {
        entry.fn.call(entry.context, ...args);
      } else {
        entry.fn(...args);
      }
      if (entry.once) firedOnce = true;
    }
    if (firedOnce) {
      const survivors = list.filter((entry) => !entry.once);
      if (survivors.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, survivors);
      }
    }
    return true;
  }

  private addListener(
    event: string,
    fn: Listener,
    context: unknown,
    once: boolean,
  ): this {
    const entry: ListenerEntry = { fn, context, once };
    const list = this.listeners.get(event);
    if (list) {
      list.push(entry);
    } else {
      this.listeners.set(event, [entry]);
    }
    return this;
  }
}

/** Global EventBus for React ↔ Phaser ↔ engine communication. */
export const EventBus = new TinyEventEmitter();

/** Whether the Phaser scene has finished creating. */
export let sceneReady = false;

EventBus.on(GameEvent.SceneReady, () => {
  sceneReady = true;
});
