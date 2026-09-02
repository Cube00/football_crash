import type { PhaseChangePayload } from "@/sdk";

/**
 * Names carried on the {@link EventBus} — the skin's own bus, which exists for
 * one reason: the canvas must stay out of the React render cycle.
 *
 * `sfs:*` names are SDK events relayed verbatim by {@link SdkEventBridge}. The
 * SDK's guide calls for exactly this: subscribe once with `client.on(...)` near
 * the root and re-emit onto a local bus, so Phaser never holds a React
 * subscription. They are **relays, not sources** — nothing may emit an `sfs:*`
 * event except the bridge. The rest is React ↔ Phaser plumbing that is ours.
 *
 * Only what something actually consumes is listed. The bus used to carry a
 * dozen `engine:*` and `cmd:*` names for the local engine; that engine is gone,
 * and relaying an event no scene or sound module listens to is just a longer
 * path to nowhere. Adding one back is a line in each file when a consumer
 * appears — the sound layer will want `crash` and `cashout-done`.
 */
export const GameEvent = {
  // ── SDK → skin (relayed by SdkEventBridge) ────────────────────
  /** Phase changed. Drives the Spine choreography. */
  PhaseChange: "sfs:phase-change",

  // ── React ↔ Phaser bridge (ours) ──────────────────────────────
  /** The Phaser scene finished creating and can receive sync events. */
  SceneReady: "scene-ready",
  /** The scene asks to be told the phase — it may have booted mid-round. */
  RequestPhaseSync: "request-phase-sync",
} as const;

export type GameEvent = (typeof GameEvent)[keyof typeof GameEvent];

/** Payload carried by each bus event. */
export interface GameEventPayloads {
  [GameEvent.PhaseChange]: PhaseChangePayload;
  [GameEvent.SceneReady]: void;
  [GameEvent.RequestPhaseSync]: void;
}
