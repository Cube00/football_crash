import { AmountButton } from "../AmountButton";
import { Stepper, StepperSize } from "../Stepper";
import { Checkbox } from "../Checkbox";
import { ROUND_OPTIONS } from "@/game/autoplay";
import type { StopCondition } from "@/game/autoplay";
import type { UseAutoPlayReturn } from "@/hooks/useAutoPlay";
import styles from "./AutoBetPanel.module.css";

interface AutoBetPanelProps {
  autoPlay: UseAutoPlayReturn;
}

const ROUND_CHOICES: Array<{ label: string; value: number }> = [
  ...ROUND_OPTIONS.map((value) => ({ label: String(value), value })),
  { label: "∞", value: Number.POSITIVE_INFINITY },
];

/**
 * Inline auto-play configuration for a single bet slot: round count,
 * per-condition stop thresholds, and a start/stop action. Lives inside the
 * BetArea so it keeps the slot context the global modal system can't carry.
 */
export const AutoBetPanel = ({ autoPlay }: AutoBetPanelProps) => {
  const { config, updateConfig, isActive, currentRound, start, stop } = autoPlay;

  const setStop = (
    key: "stopOnCashDecrease" | "stopOnCashIncrease" | "stopOnSingleWin",
    patch: Partial<StopCondition>,
  ) => updateConfig({ [key]: { ...config[key], ...patch } });

  const stopRow = (
    key: "stopOnCashDecrease" | "stopOnCashIncrease" | "stopOnSingleWin",
    label: string,
  ) => {
    const cond = config[key];
    return (
      <div className={styles["auto-panel__row"]} key={key}>
        <label className={styles["auto-panel__check"]}>
          <Checkbox
            checked={cond.enabled}
            onChange={(e) => setStop(key, { enabled: e.target.checked })}
          />
          <span>{label}</span>
        </label>
        <Stepper
          size={StepperSize.Compact}
          value={cond.amount}
          min={0}
          step={1}
          disabled={!cond.enabled}
          onValueChange={(amount) => setStop(key, { amount })}
        />
      </div>
    );
  };

  return (
    <div className={styles["auto-panel"]}>
      <div className={styles["auto-panel__rounds"]}>
        <span className={styles["auto-panel__label"]}>Rounds</span>
        <div className={styles["auto-panel__choices"]}>
          {ROUND_CHOICES.map((choice) => (
            <AmountButton
              key={choice.label}
              label={choice.label}
              active={config.rounds === choice.value}
              onClick={() => updateConfig({ rounds: choice.value })}
            />
          ))}
        </div>
      </div>

      {stopRow("stopOnCashIncrease", "Stop if cash increases by")}
      {stopRow("stopOnCashDecrease", "Stop if cash decreases by")}
      {stopRow("stopOnSingleWin", "Stop on single win of")}

      <button
        type="button"
        className={styles["auto-panel__action"]}
        onClick={() => (isActive ? stop() : start(config.rounds))}
      >
        {isActive
          ? `Stop Auto Bet${
              Number.isFinite(currentRound) ? ` (${currentRound} left)` : ""
            }`
          : "Start Auto Bet"}
      </button>
    </div>
  );
};
