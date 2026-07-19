import { cx } from "@/utils";
import styles from "./ProbablyFairContent.module.css";

export const ProbablyFairContent = () => {
  return (
    <div className={styles["probably"]}>
      <div className={styles["probably-howworks"]}>
        <h2>How It Works</h2>
        <span>
          Our Provably Fair system uses several parameters to ensure complete
          transparency and fairness. Each round has both hidden and revealed
          states.
        </span>
      </div>
      <div className={styles["probably-beforestarts"]}>
        <h2 className={styles["probably-beforestarts__label"]}>
          Before the Round Starts (Hidden State)
        </h2>
        <div className={styles["probably-table"]}>
          <div className={styles["probably-table__row"]}>
            <div
              className={cx(
                styles["probably-table__head"],
                styles["probably-table__col--num"],
              )}
            >
              Round Number
            </div>
            <div className={styles["probably-table__head"]}>Server Key</div>
            <div className={styles["probably-table__head"]}>Crash Point</div>
            <div className={styles["probably-table__head"]}>
              Provably Fair Hash
            </div>
          </div>
          <div className={styles["probably-table__row__cels"]}>
            <div
              className={cx(
                styles["probably-table__cell"],
                styles["probably-table__col--num"],
              )}
            >
              1
            </div>
            <div className={styles["probably-table__cell"]}>Hidden</div>
            <div className={styles["probably-table__cell"]}>Hidden</div>
            <div className={styles["probably-table__cell"]}>
              8f3a2b9c7d1e...
            </div>
          </div>
        </div>
      </div>
      <div className={styles["probably-begins"]}>
        <h3 className={styles["probably-begins__title"]}>
          Before the game begins, players can see:
        </h3>
        <ul className={styles["probably-begins__list"]}>
          <li className={styles["probably-begins__item"]}>
            <span className={styles["probably-begins__term"]}>Round Number</span>{" "}
            - The current round identifier
          </li>
          <li className={styles["probably-begins__item"]}>
            <span className={styles["probably-begins__term"]}>
              Provably Fair Hash
            </span>{" "}
            - A cryptographic hash that proves the round outcome was
            predetermined
          </li>
        </ul>
        <p className={styles["probably-begins__note"]}>
          The Server Key and Crash Point remain hidden to ensure fairness.
        </p>
      </div>
    </div>
  );
};
