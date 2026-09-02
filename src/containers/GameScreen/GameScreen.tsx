import { Multiplier } from "@/components/ui/Multiplier";
import { BetArea } from "@/components/ui/BetArea";
import { GameStage } from "@/containers/GameStage";
import { BetLayout, BetSlot, useBetLayout, useBetting, useFreerounds } from "@/sdk";
import { isSlotFreebetLocked } from "@/game/freerounds";
import styles from "./GameScreen.module.css";

export const GameScreen = () => {
  const { layout } = useBetLayout();
  const { state: freeround } = useFreerounds();

  // Read here rather than inside each panel because the free-bet lock is a
  // question about *both* slots: whether the grant has a bet left once the
  // other slot's queued or in-flight one is counted against it.
  const slot1 = useBetting(BetSlot.Slot1).slotState;
  const slot2 = useBetting(BetSlot.Slot2).slotState;
  const slots = [slot1, slot2];

  const showSecondSlot = layout === BetLayout.Double;

  return (
    <div className={styles["game-screen"]}>
      <Multiplier />
      <div className={styles["game-canvas"]}>
        <GameStage className={styles["game-phaser"]} />
      </div>
      <div className={styles["game-betAreas"]}>
        <BetArea
          slot={BetSlot.Slot1}
          freebetLocked={isSlotFreebetLocked(freeround, slot1, slots)}
        />
        {showSecondSlot && (
          <BetArea
            slot={BetSlot.Slot2}
            freebetLocked={isSlotFreebetLocked(freeround, slot2, slots)}
          />
        )}
      </div>
    </div>
  );
};
