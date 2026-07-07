import { Multiplier } from "@/components/ui/Multiplier";
import { BetArea } from "@/components/ui/BetArea";
import styles from "./GameScreen.module.css";

export const GameScreen = () => {
  return (
    <div className={styles["game-screen"]}>
      <Multiplier />
      <div className={styles["game-canvas"]}>
        <canvas></canvas>
      </div>
      <div className={styles["game-betAreas"]}>
        <BetArea />
        <BetArea />
      </div>
    </div>
  );
};
