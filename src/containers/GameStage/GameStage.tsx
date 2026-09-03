import { lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import { cx } from "@/utils";
import { CountdownBar } from "@/components/ui/CountdownBar";
import { FreeBetButton } from "@/components/ui/FreeBetButton";
import { MultiplierValue } from "@/components/ui/MultiplierValue";
import { WinNotification } from "@/components/ui/WinNotification";
import { useModal, ModalId } from "@/context/ModalProvider";
import { useMoney, useRoundCountdown, useWinNotice } from "@/hooks";
import {
  GamePhase,
  useFreerounds,
  useMultiplier,
  usePhase,
  useSettings,
} from "@/sdk";
import { CRASH_FLASH_MS, WIN_NOTIFICATION_MS } from "@/game/display";
import { remainingBets } from "@/game/freerounds";
import styles from "./GameStage.module.css";
import {
  STILL_BACKGROUND,
  STILL_BACKGROUND_SIZE,
} from "./GameStage.constants";
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
  // The canvas switch is one of the SDK's three settings, alongside sound and
  // music — it owns the value, this decides what to do with it.
  const { settings } = useSettings();
  const animated = settings.animation;
  const { open } = useModal();
  const phase = usePhase();
  const multiplier = useMultiplier();
  const { remainingMs, totalMs } = useRoundCountdown();
  const { win, dismiss } = useWinNotice();
  const { currency, decimals } = useMoney();
  // Bets left across every grant the player holds — what the badge counts.
  const { grants } = useFreerounds();
  const freeBets = grants.reduce(
    (sum, grant) => sum + remainingBets(grant),
    0,
  );

  const betting = phase === GamePhase.BettingOpen;
  const crashed = phase === GamePhase.Crashed;

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
          width={STILL_BACKGROUND_SIZE.width}
          height={STILL_BACKGROUND_SIZE.height}
          alt=""
        />
      )}

      {/* Sits after the scene in source order, so it lays over the canvas
          without needing a z-index of its own — and stays under the HUD, which
          has one. */}
      {crashed && (
        <div
          className={styles["game-stage__crash"]}
          style={
            { "--crash-ms": `${CRASH_FLASH_MS}ms` } as CSSProperties
          }
          aria-hidden="true"
        />
      )}

      {win && (
        <div className={styles["game-stage__notice"]}>
          <WinNotification
            key={win.key}
            className={styles["game-stage__win"]}
            amount={win.amount}
            currency={currency}
            decimals={decimals}
            durationMs={WIN_NOTIFICATION_MS}
            onClose={dismiss}
          />
        </div>
      )}

      <div className={styles["game-stage__hud"]}>
        {betting ? (
          <CountdownBar remainingMs={remainingMs} totalMs={totalMs} />
        ) : (
          <MultiplierValue
            value={multiplier.toFixed(2)}
            crashed={phase === GamePhase.Crashed}
          />
        )}
      </div>

      {freeBets > 0 && (
        <FreeBetButton
          className={styles["game-stage__free-bet"]}
          count={freeBets}
          onClick={() => open(ModalId.BetType)}
        />
      )}
    </div>
  );
};
