import { Multiplier } from "@/components/ui/Multiplier";
import { BetArea } from "@/components/ui/BetArea";
import { GameStage } from "@/containers/GameStage";
import { BetSlot } from "@/game/enums";
import styles from "./GameScreen.module.css";

export const GameScreen = () => {
  return (
    <div className={styles["game-screen"]}>
      <Multiplier />
      <div className={styles["game-canvas"]}>
        <GameStage className={styles["game-phaser"]} />
      </div>
      <div className={styles["game-betAreas"]}>
        <BetArea slot={BetSlot.Slot1} />
        <BetArea slot={BetSlot.Slot2} />
      </div>
    </div>
  );
};
