import { useEffect, useRef } from "react";
import type { Game } from "phaser";
import { renderScale, startGame } from "@/game/main";

interface PhaserGameProps {
  className?: string;
}

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
      container.appendChild(sharedGame.canvas);
    }
    const game = sharedGame;

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
