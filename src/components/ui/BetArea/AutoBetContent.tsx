import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { cx } from "@/utils";
import { playSound, Sound } from "@/game/sounds";
import { useMoney } from "@/hooks";
import { Stepper, StepperSize } from "../Stepper";
import { Checkbox } from "../Checkbox";
import type { AutoPlayReturn, StopCondition } from "@/sdk";
import styles from "./AutoBetContent.module.css";

interface AutoBetContentProps {
  autoPlay: AutoPlayReturn;
  /** Current per-round stake, for the Bet / Total readout. */
  betAmount: number;
  /** Closes the modal after Start. */
  onClose: () => void;
}

type StopKey = "stopOnCashIncrease" | "stopOnCashDecrease" | "stopOnSingleWin";

const STOP_FIELDS: Array<{ key: StopKey; labelKey: TranslationKey }> = [
  { key: "stopOnCashIncrease", labelKey: "autoBet.cashIncreasedBy" },
  { key: "stopOnCashDecrease", labelKey: "autoBet.cashDecreasedBy" },
  { key: "stopOnSingleWin", labelKey: "autoBet.singleWinExceeds" },
];

/**
 * Auto-play configuration dialog body: round-count presets, the bet/total
 * readout, the three "stop auto play on" conditions, and Reset / Start. Wired
 * to a single slot's {@link useAutoPlay} handle.
 */
export const AutoBetContent = ({
  autoPlay,
  betAmount,
  onClose,
}: AutoBetContentProps) => {
  const { t } = useTranslation();
  const { currency, format } = useMoney();
  const { config, updateConfig, isActive, reset, start, stop, selectRounds, roundOptions } =
    autoPlay;
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
        {roundOptions.map((option) => (
          <button
            key={option}
            type="button"
            className={cx(
              styles["auto-bet__round"],
              config.rounds === option && styles["auto-bet__round--active"],
            )}
            onClick={() => {
              playSound(Sound.SmallButton);
              selectRounds(option);
            }}
          >
            <span className={styles["auto-bet__round-value"]}>{option}</span>
            <span className={styles["auto-bet__round-label"]}>
              {t("autoBet.rounds")}
            </span>
          </button>
        ))}
      </div>

      <div className={styles["auto-bet__summary"]}>
        <span className={styles["auto-bet__summary-item"]}>
          {t("autoBet.betLabel")}{" "}
          <span className={styles["auto-bet__amount"]}>
            {format(betAmount)} {currency}
          </span>
        </span>
        <span className={styles["auto-bet__summary-item"]}>
          {t("autoBet.totalLabel")}{" "}
          <span className={styles["auto-bet__amount"]}>
            {format(total)} {currency}
          </span>
        </span>
      </div>

      <div className={styles["auto-bet__divider"]} />

      <h3 className={styles["auto-bet__section"]}>
        {t("autoBet.stopAutoPlayOn")}
      </h3>

      <div className={styles["auto-bet__conditions"]}>
        {STOP_FIELDS.map(({ key, labelKey }) => {
          const cond = config[key];
          return (
            <div key={key} className={styles["auto-bet__card"]}>
              <div className={styles["auto-bet__card-head"]}>
                <span className={styles["auto-bet__card-label"]}>
                  {t(labelKey)}
                </span>
                <Checkbox
                  className={styles["auto-panel__checkbox"]}
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
          {t("common.reset")}
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
          {isActive ? t("common.stop") : t("common.start")}
        </button>
      </div>
    </div>
  );
};
