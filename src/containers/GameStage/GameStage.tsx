import { lazy, Suspense } from "react";
import { cx } from "@/utils";
import { CountdownBar } from "@/components/ui/CountdownBar";
import { FreeBetButton } from "@/components/ui/FreeBetButton";
import { MultiplierValue } from "@/components/ui/MultiplierValue";
import { WinNotification } from "@/components/ui/WinNotification";
import { useModal, ModalId } from "@/context/ModalProvider";
import {
  useAnimationEnabled,
  useWinNotification,
  WIN_NOTIFICATION_MS,
} from "@/hooks";
import { usePhase } from "@/hooks/useGame";
import { useTick } from "@/hooks/useTick";
import { GamePhase } from "@/game/enums";
import { ROUND_TIMINGS } from "@/game/config";
import styles from "./GameStage.module.css";
import { FREE_BET_COUNT, STILL_BACKGROUND } from "./GameStage.constants";
import type { GameStageProps } from "./GameStage.types";

// Lazy so the Phaser bundle stays out of the main chunk — and, with animation
// off, never downloads at all.
const PhaserGame = lazy(() =>
  import("./PhaserGame").then((m) => ({
    default: m.PhaserGame,
  })),
);

/**
 * The round's picture, in one of two modes.
 *
 * Animated, it is the Spine scene on a Phaser canvas. With animation switched
 * off in the menu it is a single still image and no canvas exists at all —
 * Phaser is never even fetched.
 *
 * The multiplier and the betting countdown are DOM either way, layered over the
 * top. That is what makes the still mode possible: the numbers a player needs
 * are never trapped inside the canvas.
 */
export const GameStage = ({ className, ...rest }: GameStageProps) => {
  const animated = useAnimationEnabled();
  const { open } = useModal();
  const phase = usePhase();
  const { tick, remainingMs } = useTick();
  const { win, dismiss } = useWinNotification();

  const betting = phase === GamePhase.BettingOpen;

  return (
    <div className={cx(styles["game-stage"], className)} {...rest}>
      {animated ? (
        <Suspense fallback={null}>
          <PhaserGame className={styles["game-stage__scene"]} />
        </Suspense>
      ) : (
        <img
          className={styles["game-stage__still"]}
          src={STILL_BACKGROUND}
          alt=""
        />
      )}

      {win && (
        <div className={styles["game-stage__notice"]}>
          <WinNotification
            key={win.betId}
            className={styles["game-stage__win"]}
            amount={win.amount}
            currency={win.currency}
            durationMs={WIN_NOTIFICATION_MS}
            onClose={dismiss}
          />
        </div>
      )}

      <div className={styles["game-stage__hud"]}>
        {betting ? (
          <CountdownBar
            remainingMs={remainingMs}
            totalMs={ROUND_TIMINGS.bettingMs}
          />
        ) : (
          <MultiplierValue value={tick} crashed={phase === GamePhase.Crashed} />
        )}
      </div>

      <FreeBetButton
        className={styles["game-stage__free-bet"]}
        count={FREE_BET_COUNT}
        onClick={() => open(ModalId.BetType)}
      />
    </div>
  );
};
