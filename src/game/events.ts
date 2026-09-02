import type {
  BetPlacedPayload,
  CashoutDonePayload,
  CrashPayload,
  PhaseChangePayload,
  TickPayload,
} from "@/sdk";

/**
 * Names carried on the {@link EventBus} — the skin's own bus, which exists for
 * one reason: the canvas and the sound layer must stay out of the React render
 * cycle.
 *
 * Two groups:
 *
 * - `sfs:*` — SDK events, relayed verbatim by {@link SdkEventBridge}. The SDK's
 *   integration guide calls for exactly this: subscribe once with
 *   `client.on(...)` near the root and re-emit onto a local bus, so Phaser never
 *   holds a React subscription. These are **relays, not sources** — nothing in
 *   this app may emit an `sfs:*` event except the bridge.
 * - the rest — React ↔ Phaser plumbing that is genuinely ours (scene lifecycle,
 *   layout, resize). The SDK has no opinion on these.
 *
 * Everything the old local engine used to publish here (`engine:*`) and every
 * command the UI used to send it (`cmd:*`) is gone: the SDK owns round state and
 * is commanded through its own client methods, not through this bus.
 */
export const GameEvent = {
  // ── SDK → skin (relayed by SdkEventBridge) ────────────────────
  /** Round update: multiplier, phase, round id, remaining ms. */
  Tick: "sfs:tick",
  /** Phase changed. Drives the Spine animation. */
  PhaseChange: "sfs:phase-change",
  /** The round crashed, at this multiplier. */
  Crash: "sfs:crash",
  /** A bet of the player's own was accepted. */
  BetPlaced: "sfs:bet-placed",
  /** A cashout of the player's own succeeded. */
  CashoutDone: "sfs:cashout-done",

  // ── React ↔ Phaser bridge (ours) ──────────────────────────────
  /** The Phaser scene finished creating and can receive sync events. */
  SceneReady: "scene-ready",
  /** The scene asks to be told the current phase — it may have booted mid-round. */
  RequestPhaseSync: "request-phase-sync",
  /** React tells Phaser whether the layout is mobile. */
  SetMobile: "set-mobile",
  /** The canvas should recompute its dimensions after a layout change. */
  GameResize: "game-resize",
} as const;

export type GameEvent = (typeof GameEvent)[keyof typeof GameEvent];

/** Payload carried by each bus event, for the typed emitter. */
export interface GameEventPayloads {
  [GameEvent.Tick]: TickPayload;
  [GameEvent.PhaseChange]: PhaseChangePayload;
  [GameEvent.Crash]: CrashPayload;
  [GameEvent.BetPlaced]: BetPlacedPayload;
  [GameEvent.CashoutDone]: CashoutDonePayload;
  [GameEvent.SceneReady]: void;
  [GameEvent.RequestPhaseSync]: void;
  [GameEvent.SetMobile]: boolean;
  [GameEvent.GameResize]: void;
}
