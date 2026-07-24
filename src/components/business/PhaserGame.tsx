import { useEffect, useRef } from "react";
import type { Game } from "phaser";
import { renderScale, startGame } from "@/game/main";

interface PhaserGameProps {
  className?: string;
}

/**
 * Single shared Phaser game, held at module scope.
 *
 * React StrictMode runs effects twice in dev (setup → cleanup → setup) on the
 * same DOM node. Creating/destroying a Phaser game on that cycle would spawn a
 * second game whose teardown *globally* unregisters the Spine `add.spine`
 * factory — breaking the survivor. So we reuse one game and debounce teardown:
 * a remount within the window cancels the pending destroy, leaving exactly one
 * game. On a real unmount the timer fires and the game is destroyed.
 */
let sharedGame: Game | null = null;
let destroyTimer: ReturnType<typeof setTimeout> | null = null;

export const PhaserGame = ({ className }: PhaserGameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (destroyTimer) {
      clearTimeout(destroyTimer);
      destroyTimer = null;
    }

    if (!sharedGame) {
      sharedGame = startGame(container);
    } else if (
      sharedGame.canvas &&
      sharedGame.canvas.parentElement !== container
    ) {
      // Re-attach the existing canvas if the container node changed.
      container.appendChild(sharedGame.canvas);
    }
    const game = sharedGame;

    // Device pixels in, CSS pixels out — `zoom` divides the backing store back
    // down to the container's size. The zoom is re-checked because dragging the
    // window to a display with a different pixel density changes the ratio.
    const applySize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const dpr = renderScale();
      if (game.scale.zoom !== 1 / dpr) game.scale.setZoom(1 / dpr);
      game.scale.resize(clientWidth * dpr, clientHeight * dpr);
    };

    const observer = new ResizeObserver(applySize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      destroyTimer = setTimeout(() => {
        sharedGame?.destroy(true);
        sharedGame = null;
        destroyTimer = null;
      }, 300);
    };
  }, []);

  return <div ref={containerRef} className={className} />;
};
