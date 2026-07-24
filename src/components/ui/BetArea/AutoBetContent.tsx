import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import { Stepper, StepperSize } from "../Stepper";
import { Checkbox } from "../Checkbox";
import { ROUND_OPTIONS } from "@/game/autoplay";
import type { StopCondition } from "@/game/autoplay";
import type { UseAutoPlayReturn } from "@/hooks/useAutoPlay";
import styles from "./AutoBetContent.module.css";

interface AutoBetContentProps {
  autoPlay: UseAutoPlayReturn;
  /** Current per-round stake, for the Bet / Total readout. */
  betAmount: number;
  currency: string;
  /** Closes the modal after Start. */
  onClose: () => void;
}

type StopKey =
  | "stopOnCashIncrease"
  | "stopOnCashDecrease"
  | "stopOnSingleWin";

const STOP_FIELDS: Array<{ key: StopKey; label: string }> = [
  { key: "stopOnCashIncrease", label: "Cash Increased by" },
  { key: "stopOnCashDecrease", label: "Cash decreased by" },
  { key: "stopOnSingleWin", label: "Single win exceeds" },
];

/**
 * Auto-play configuration dialog body: round-count presets, the bet/total
 * readout, the three "stop auto play on" conditions, and Reset / Start. Wired
 * to a single slot's {@link useAutoPlay} handle.
 */
export const AutoBetContent = ({
  autoPlay,
  betAmount,
  currency,
  onClose,
}: AutoBetContentProps) => {
  const { config, updateConfig, isActive, reset, start, stop } = autoPlay;
  const total = betAmount * config.rounds;

  const setStop = (key: StopKey, patch: Partial<StopCondition>) =>
    updateConfig({ [key]: { ...config[key], ...patch } });

  const handleStart = () => {
    playSound(Sound.SmallButton);
    if (isActive) {
      stop();
    } else {
      start(config.rounds);
    }
    onClose();
  };

  return (
    <div className={styles["auto-bet"]}>
      <div className={styles["auto-bet__rounds"]}>
        {ROUND_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={cx(
              styles["auto-bet__round"],
              config.rounds === option && styles["auto-bet__round--active"],
            )}
            onClick={() => {
              playSound(Sound.SmallButton);
              updateConfig({ rounds: option });
            }}
          >
            <span className={styles["auto-bet__round-value"]}>{option}</span>
            <span className={styles["auto-bet__round-label"]}>Rounds</span>
          </button>
        ))}
      </div>

      <div className={styles["auto-bet__summary"]}>
        <span className={styles["auto-bet__summary-item"]}>
          Bet:{" "}
          <span className={styles["auto-bet__amount"]}>
            {betAmount.toFixed(2)} {currency}
          </span>
        </span>
        <span className={styles["auto-bet__summary-item"]}>
          Total{" "}
          <span className={styles["auto-bet__amount"]}>
            {total.toFixed(2)} {currency}
          </span>
        </span>
      </div>

      <div className={styles["auto-bet__divider"]} />

      <h3 className={styles["auto-bet__section"]}>Stop auto play on</h3>

      <div className={styles["auto-bet__conditions"]}>
        {STOP_FIELDS.map(({ key, label }) => {
          const cond = config[key];
          return (
            <div key={key} className={styles["auto-bet__card"]}>
              <div className={styles["auto-bet__card-head"]}>
                <span className={styles["auto-bet__card-label"]}>{label}</span>
                <Checkbox
                  checked={cond.enabled}
                  onChange={(e) => setStop(key, { enabled: e.target.checked })}
                />
              </div>
              <Stepper
                className={styles["auto-bet__card-stepper"]}
                size={StepperSize.Compact}
                value={cond.amount}
                min={0}
                step={1}
                precision={2}
                onValueChange={(amount) => setStop(key, { amount })}
              />
            </div>
          );
        })}
      </div>

      <div className={styles["auto-bet__actions"]}>
        <button
          type="button"
          className={cx(
            styles["auto-bet__button"],
            styles["auto-bet__button--reset"],
          )}
          onClick={() => {
            playSound(Sound.SmallButton);
            reset();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className={cx(
            styles["auto-bet__button"],
            styles["auto-bet__button--start"],
            isActive && styles["auto-bet__button--stop"],
          )}
          onClick={handleStart}
        >
          {isActive ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
};
