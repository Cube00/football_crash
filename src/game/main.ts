import { Game, Scale } from "phaser";
import type { Types } from "phaser";
import * as spine from "@esotericsoftware/spine-phaser-v3";
import { GameScene } from "./scenes/GameScene";

/**
 * Device pixels per CSS pixel, capped at 2 — past that the extra fill rate costs
 * far more than it shows, especially on phones.
 */
export const renderScale = () => Math.min(window.devicePixelRatio || 1, 2);

/**
 * Boots the Phaser game into the given parent element.
 *
 * The canvas is sized in DEVICE pixels and scaled back down in CSS, so the Spine
 * art renders at the display's real resolution. `RESIZE` mode cannot do this —
 * it hard-wires the backing store to a 1:1 CSS-pixel mapping, which on a retina
 * screen means everything is drawn at half resolution and upscaled by the
 * browser. `NONE` + `zoom` keeps the same "canvas fills its container" behaviour
 * while leaving the backing store under our control; PhaserGame drives the size
 * from a ResizeObserver.
 *
 * Nothing in the scene needs to know: every measurement there is a fraction of
 * `scale.width/height`, so the layout and type sizes follow automatically.
 */
export function startGame(parent: HTMLElement): Game {
  const dpr = renderScale();
  const width = Math.max(parent.clientWidth, 1) * dpr;
  const height = Math.max(parent.clientHeight, 1) * dpr;

  // `type` defaults to AUTO (WebGL with a Canvas fallback) when omitted.
  const config: Types.Core.GameConfig = {
    parent,
    backgroundColor: "#151419",
    width,
    height,
    scale: {
      mode: Scale.NONE,
      zoom: 1 / dpr,
      autoCenter: Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
    },
    fps: {
      /**
       * Phaser's delta smoothing caps every frame's delta at one 60fps step
       * (16.67ms) while the window is unfocused, and for ~2s after it regains
       * focus. Any frame slower than 60fps then advances the animation by less
       * than the time that actually passed: measured here at 54% speed on
       * 30ms frames. That matters more than usual for a crash game, because the
       * multiplier is driven by the wall clock — the boy would juggle in slow
       * motion while the number kept real time. The raw delta keeps them
       * together; a hidden tab is already handled by the loop pausing, which
       * resets the delta on resume rather than dumping the gap into one frame.
       */
      smoothStep: false,
    },
    scene: [GameScene],
    plugins: {
      scene: [
        {
          key: "spine.SpinePlugin",
          plugin: spine.SpinePlugin,
          mapping: "spine",
        },
      ],
    },
  };

  return new Game(config);
}
