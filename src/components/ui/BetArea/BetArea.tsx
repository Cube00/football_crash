import { useState } from "react";
import { cx } from "@/utils";
import { Size } from "@/constants";
import { Stepper, StepperSize } from "../Stepper";
import { AmountButton } from "../AmountButton";
import { BetButton, BetButtonVariant } from "../BetButton";
import { Toggle } from "../Toggle";
import styles from "./BetArea.module.css";
import { AMOUNT_PRESETS, BET_AREA_DEFAULTS } from "./BetArea.constants";
import type { BetAreaProps } from "./BetArea.types";

export const BetArea = ({
  currency = BET_AREA_DEFAULTS.currency,
  defaultAmount = BET_AREA_DEFAULTS.amount,
  defaultMultiplier = BET_AREA_DEFAULTS.multiplier,
  className,
  ...rest
}: BetAreaProps) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [multiplier, setMultiplier] = useState(defaultMultiplier);
  const [autoBet, setAutoBet] = useState(false);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const selectPreset = (preset: number, index: number) => {
    setAmount(() => preset);
    setActivePreset(index);
  };

  return (
    <div className={cx(styles["bet-area"], className)} {...rest}>
      <div className={styles["bet-area__top"]}>
        <div className={styles["bet-area__controls"]}>
          <Stepper
            className={styles["bet-area__stepper"]}
            value={amount}
            min={0}
            step={1}
            onValueChange={(next) => {
              setAmount(next);
              setActivePreset(null);
            }}
          />

          <div className={styles["bet-area__presets"]}>
            {AMOUNT_PRESETS.map((preset, index) => (
              <AmountButton
                key={preset.label}
                label={preset.label}
                active={activePreset === index}
                onClick={() => selectPreset(preset.value, index)}
              />
            ))}
          </div>
        </div>

        <BetButton
          className={styles["bet-area__bet"]}
          variant={BetButtonVariant.Bet}
          size={Size.Web}
          label="Bet"
          amount={amount.toFixed(2)}
          currency={currency}
        />
      </div>

      <div className={styles["bet-area__bottom"]}>
        <div className={styles["bet-area__togglesection"]}>
          <label className={styles["bet-area__toggle"]}>
            <span className={styles["bet-area__toggle-label"]}>Auto Bet</span>
            <Toggle
              checked={autoBet}
              onChange={(event) => setAutoBet(event.target.checked)}
            />
          </label>
          <label className={styles["bet-area__toggle"]}>
            <span className={styles["bet-area__toggle-label"]}>
              Auto Cash Out
            </span>
            <Toggle
              checked={autoCashOut}
              onChange={(event) => setAutoCashOut(event.target.checked)}
            />
          </label>
        </div>
        <Stepper
          className={styles["bet-area__multiplier"]}
          size={StepperSize.Compact}
          value={multiplier}
          min={1}
          step={0.5}
          suffix="x"
          onValueChange={setMultiplier}
        />
      </div>
    </div>
  );
};
