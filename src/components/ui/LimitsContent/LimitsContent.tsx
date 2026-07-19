import styles from "./LimitsContent.module.css";

export const LimitsContent = () => {
  return (
    <div className={styles["limits"]}>
      <div className={styles["limits-block"]}>
        <h2>Maximum Win</h2>
        <span>
          The highest possible multiplier is 25,000x your bet. This is the
          absolute ceiling—even if the game continues beyond this point
          (theoretically), your payout caps at 25,000x.
        </span>
      </div>
      <div className={styles["limits-block"]}>
        <h2>Minimum Cash-Out (Free Bets Only)</h2>
        <span>
          When playing with free bets, a minimum cash-out multiplier applies
          (typically 1.50x, but configurable). You cannot cash out below this
          threshold when using promotional free bets.
        </span>
      </div>
    </div>
  );
};
