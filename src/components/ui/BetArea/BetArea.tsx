import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { Size } from "@/constants";
import { Stepper, StepperSize } from "../Stepper";
import { AmountButton } from "../AmountButton";
import { BetButton } from "../BetButton";
import { Toggle } from "../Toggle";
import { Modal, ModalWidth } from "../Modal";
import { useModal, ModalId } from "@/context/ModalProvider";
import { AutoBetContent } from "./AutoBetContent";
import {
  BetButtonVariant,
  FreeroundKind,
  useAutoPlay,
  useBettingSlot,
  useFreerounds,
  useGameConfig,
  useMultiplier,
} from "@/sdk";
import { FALLBACK_CURRENCY } from "@/game/display";
import { freebetStake, remainingBets, totalBets } from "@/game/freerounds";
import { FreeBetAmount } from "./FreeBetAmount";
import styles from "./BetArea.module.css";
import { AMOUNT_PRESETS } from "./BetArea.constants";
import type { BetAreaProps } from "./BetArea.types";

/** What the primary button shows and does for the variant the SDK reports. */
interface ButtonFace {
  label: string;
  /** Money row. Omitted when {@link text} takes the row instead. */
  amount?: string;
  /** Replaces the money row with a single line of copy. */
  text?: string;
  /** Absent for the in-flight and terminal variants, which are disabled. */
  onClick?: () => void;
}

/** Variants that are a settled or in-flight action rather than an offer. */
const COMMITTED: readonly BetButtonVariant[] = [
  BetButtonVariant.Sending,
  BetButtonVariant.Cancel,
  BetButtonVariant.CancelWaiting,
  BetButtonVariant.Cashout,
  BetButtonVariant.CashingOut,
  BetButtonVariant.Cancelling,
  BetButtonVariant.Lost,
];

export const BetArea = ({
  slot,
  freebetLocked = false,
  className,
  ...rest
}: BetAreaProps) => {
  const { t } = useTranslation();
  const { open } = useModal();
  const config = useGameConfig();
  const currency = config?.currency ?? FALLBACK_CURRENCY;
  const multiplier = useMultiplier();

  const {
    slotState,
    onBet,
    onBetAmountChange,
    cashout,
    cancelBet,
    autoCashout,
    isAutoPlayActive,
    onStopAutoPlay,
  } = useBettingSlot(slot);

  // The panel runs on `useBettingSlot` — it is the hook that sends
  // `autoCashoutAt` with the bet and holds the target to a grant's floor. The
  // configuration dialog needs the round presets and Reset, which live on
  // `useAutoPlay`; both read the same slice, so the two stay in step.
  const autoPlay = useAutoPlay(slot);

  const { state: freeround } = useFreerounds();
  const onFreeBet = Boolean(freeround?.isActive);

  const [showAutoModal, setShowAutoModal] = useState(false);
  const closeAutoModal = () => setShowAutoModal(false);

  const { buttonVariant, isButtonDisabled, bet, betInputAmount } = slotState;

  // What the next bet will actually cost: a bound grant dictates the stake for
  // fixed grants and bounds it for range ones.
  const stake = freeround
    ? freebetStake(freeround, betInputAmount)
    : betInputAmount;

  // The slot is committed once the button is anything but an offer to bet: the
  // stake and the auto settings are what that bet was struck on, so they freeze
  // until it resolves.
  const committed = COMMITTED.includes(buttonVariant);
  const inputsDisabled = committed || isAutoPlayActive;

  const settledAmount = bet?.amount ?? stake;
  const liveCashout = (bet?.amount ?? 0) * multiplier;

  /**
   * The button is rendered, not reasoned about. `buttonVariant` and
   * `isButtonDisabled` come from the SDK's `computeButtonVariant()`, which
   * already folds in phase, bet state, in-flight requests and the freeze
   * detector — everything this component used to work out for itself.
   */
  const button: ButtonFace = (() => {
    switch (buttonVariant) {
      case BetButtonVariant.Cashout:
        return {
          label: t("bet.cashOut"),
          amount: liveCashout.toFixed(2),
          onClick: cashout,
        };
      case BetButtonVariant.CashingOut:
        return {
          label: t("bet.cashingOut"),
          amount: liveCashout.toFixed(2),
        };
      case BetButtonVariant.Cancel:
        return {
          label: t("bet.cancel"),
          amount: settledAmount.toFixed(2),
          onClick: cancelBet,
        };
      case BetButtonVariant.Cancelling:
        return {
          label: t("bet.cancelling"),
          amount: settledAmount.toFixed(2),
        };
      case BetButtonVariant.CancelWaiting:
        return {
          label: t("bet.cancel"),
          text: t("bet.waitingForNextRound"),
        };
      case BetButtonVariant.Sending:
        return { label: t("bet.sending"), amount: stake.toFixed(2) };
      case BetButtonVariant.Lost:
        return { label: t("bet.lost"), amount: settledAmount.toFixed(2) };
      case BetButtonVariant.Freebet:
        return {
          label: t("common.freeBet"),
          amount: stake.toFixed(2),
          onClick: () => onBet(stake),
        };
      case BetButtonVariant.Bet:
      default:
        return {
          label: t("bet.bet"),
          amount: stake.toFixed(2),
          onClick: () => onBet(stake),
        };
    }
  })();

  /**
   * Auto-play is stopped through this toggle only. When a bound grant runs out
   * the SDK stops the run itself with `FREEROUND_COMPLETED`, precisely so the
   * next round cannot reach for the player's own money — a skin that also
   * watches for the grant disappearing races that and can stop a run the SDK
   * meant to continue.
   */
  const toggleAutoBet = (checked: boolean) => {
    if (checked) {
      setShowAutoModal(true);
    } else {
      onStopAutoPlay();
      setShowAutoModal(false);
    }
  };

  // A range grant lets the player choose inside the grant's own bounds; a fixed
  // one has nothing to choose, so the stepper gives way to a readout.
  const rangeFreeBet = freeround?.kind === FreeroundKind.Range;

  return (
    <div
      className={cx(
        styles["bet-area"],
        onFreeBet && styles["bet-area--freebet"],
        className,
      )}
      {...rest}
    >
      <div className={styles["bet-area__top"]}>
        <div className={styles["bet-area__controls"]}>
          {freeround && !rangeFreeBet ? (
            <FreeBetAmount
              className={styles["bet-area__stepper"]}
              amount={String(freeround.betAmount)}
              currency={currency}
              remaining={remainingBets(freeround)}
              total={totalBets(freeround)}
              aria-label={t("modals.betType")}
              onClick={() => open(ModalId.BetType)}
            />
          ) : (
            <Stepper
              className={styles["bet-area__stepper"]}
              value={betInputAmount}
              min={freeround?.betMin ?? config?.minBet ?? 0}
              max={freeround?.betMax ?? config?.maxBet}
              step={1}
              disabled={inputsDisabled}
              onValueChange={onBetAmountChange}
            />
          )}

          <div className={styles["bet-area__presets"]}>
            {AMOUNT_PRESETS.map((preset) => (
              <AmountButton
                key={preset.value}
                label={preset.labelKey ? t(preset.labelKey) : preset.label!}
                active={betInputAmount === preset.value}
                disabled={inputsDisabled || onFreeBet}
                onClick={() => onBetAmountChange(preset.value)}
              />
            ))}
          </div>
        </div>

        <BetButton
          className={styles["bet-area__bet"]}
          variant={buttonVariant}
          size={Size.Web}
          label={button.label}
          amount={button.amount}
          text={button.text}
          currency={currency}
          onClick={button.onClick}
          disabled={isButtonDisabled || freebetLocked}
        />
      </div>

      <div className={styles["bet-area__bottom"]}>
        <div className={styles["bet-area__togglesection"]}>
          <label
            className={cx(
              styles["bet-area__toggle"],
              committed && styles["bet-area__toggle--disabled"],
            )}
          >
            <span className={styles["bet-area__toggle-label"]}>
              {t("bet.autoBet")}
            </span>
            <Toggle
              checked={showAutoModal || isAutoPlayActive}
              disabled={committed}
              onChange={(event) => toggleAutoBet(event.target.checked)}
            />
          </label>
          <label
            className={cx(
              styles["bet-area__toggle"],
              committed && styles["bet-area__toggle--disabled"],
            )}
          >
            <span className={styles["bet-area__toggle-label"]}>
              {t("bet.autoCashOut")}
            </span>
            <Toggle
              checked={autoCashout.enabled}
              disabled={committed}
              onChange={(event) => autoCashout.onToggle(event.target.checked)}
            />
          </label>
        </div>
        <Stepper
          className={styles["bet-area__multiplier"]}
          size={StepperSize.Compact}
          value={autoCashout.multiplier}
          /* A bound grant sets the floor: the server refuses a cashout below
             `minCashout`, so offering a lower target would only ever produce a
             rejected bet. */
          min={freeround?.minCashout ?? 1.01}
          step={0.5}
          precision={2}
          suffix="x"
          disabled={committed || !autoCashout.canChangeMultiplier}
          onValueChange={autoCashout.onMultiplierChange}
        />
      </div>

      <Modal
        isOpen={showAutoModal}
        onClose={closeAutoModal}
        title={t("modals.autoBet")}
        width={ModalWidth.Lg}
        mobileSheet
      >
        <AutoBetContent
          autoPlay={autoPlay}
          betAmount={stake}
          currency={currency}
          onClose={closeAutoModal}
        />
      </Modal>
    </div>
  );
};
