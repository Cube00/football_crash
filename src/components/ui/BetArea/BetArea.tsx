import { useMemo, useState } from "react";
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
  useBalance,
  useBettingSlot,
  useFreerounds,
  useGameConfig,
  useMultiplier,
} from "@/sdk";
import { useClientConfig, useMoney } from "@/hooks";
import { freebetStake, remainingBets, totalBets } from "@/game/freerounds";
import { FreeBetAmount } from "./FreeBetAmount";
import styles from "./BetArea.module.css";
import { DEFAULT_BET_STEP, FALLBACK_QUICK_STAKES } from "./BetArea.constants";
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
  BetButtonVariant.Cancel,
  BetButtonVariant.CancelWaiting,
  BetButtonVariant.Cashout,
  BetButtonVariant.CashingOut,
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
  const clientConfig = useClientConfig();
  const { currency, format } = useMoney();
  const multiplier = useMultiplier();
  const balance = useBalance();

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
  // `autoCashoutAt` with the bet. The configuration dialog needs the round
  // presets and Reset, which live on `useAutoPlay`; both read the same engine,
  // so the two stay in step.
  const autoPlay = useAutoPlay(slot);

  const { state: freeround } = useFreerounds();
  const onFreeBet = Boolean(freeround?.isActive);

  const [showAutoModal, setShowAutoModal] = useState(false);
  const closeAutoModal = () => setShowAutoModal(false);

  const { buttonVariant, isButtonDisabled, bet, betInputAmount } = slotState;

  const minBet = config?.minBet ?? 0;
  const maxBet = config?.maxBet;
  const step = clientConfig?.betStep ?? DEFAULT_BET_STEP;

  /**
   * The stake chips.
   *
   * `speedButtons` is the operator's list — exactly three, each with a label
   * that is only a label and a value that everything is computed from. `Max`
   * closes the row and is a calculation, not a preset: as much as the player
   * has, capped by the table maximum and floored at the minimum, so a zero
   * balance still offers a legal bet rather than nothing.
   */
  const presets = useMemo(() => {
    const quick = clientConfig?.speedButtons?.length
      ? clientConfig.speedButtons.map((button) => ({
          key: button.key,
          label: button.title,
          value: button.value,
        }))
      : FALLBACK_QUICK_STAKES.map((value) => ({
          key: String(value),
          label: String(value),
          value,
        }));

    const ceiling = maxBet ?? Number.POSITIVE_INFINITY;
    const max = Math.max(minBet, Math.min(ceiling, balance));

    return [...quick, { key: "max", label: t("bet.presetMax"), value: max }];
  }, [clientConfig, minBet, maxBet, balance, t]);

  // What the next bet will actually cost: a bound grant dictates the stake for
  // fixed grants and bounds it — by its own balance as well as `betMax` — for
  // range ones. The SDK clamps neither, so an unclamped amount is a rejection.
  const stake = freeround
    ? freebetStake(freeround, betInputAmount)
    : betInputAmount;

  // The slot is committed once the button is anything but an offer to bet: the
  // stake and the auto settings are what that bet was struck on, so they freeze
  // until it resolves.
  const committed = COMMITTED.includes(buttonVariant) || slotState.isSending;
  const inputsDisabled = committed || isAutoPlayActive;

  const settledAmount = bet?.amount ?? stake;
  const liveCashout = (bet?.amount ?? 0) * multiplier;

  /**
   * A grant's floor is the server's rule, and the SDK does not enforce it: a
   * cashout below `minCashout` is sent and comes back an error. Holding the
   * button is the only thing that keeps that from happening.
   */
  const belowFreebetFloor =
    onFreeBet &&
    freeround != null &&
    Boolean(bet?.freeroundGrantId) &&
    multiplier < freeround.minCashout;

  /**
   * The button is rendered, not reasoned about. `buttonVariant` and
   * `isButtonDisabled` come from the SDK's `computeButtonVariant()`, which
   * already folds in phase, bet state, in-flight requests and the freeze
   * detector — everything this component used to work out for itself.
   *
   * `Freebet` is the one variant the skin supplies: the SDK never returns it,
   * and its documented place is standing in for `Bet` while a grant is bound.
   */
  const face: BetButtonVariant =
    onFreeBet && buttonVariant === BetButtonVariant.Bet
      ? BetButtonVariant.Freebet
      : buttonVariant;

  const button: ButtonFace = (() => {
    switch (face) {
      case BetButtonVariant.Cashout:
        return {
          label: t("bet.cashOut"),
          amount: format(liveCashout),
          onClick: cashout,
        };
      case BetButtonVariant.CashingOut:
        return {
          label: t("bet.cashingOut"),
          amount: format(liveCashout),
        };
      case BetButtonVariant.Cancel:
        return {
          label: t("bet.cancel"),
          amount: format(settledAmount),
          // Sent but not yet acknowledged: the SDK shows Cancel disabled, so
          // the player can see the bet went out without being able to pull it.
          onClick: slotState.isSending ? undefined : cancelBet,
        };
      case BetButtonVariant.CancelWaiting:
        // Enabled in FLYING and CRASHED, and a click has two jobs: drop the
        // queued bet and stop the run that would queue the next one.
        return {
          label: t("bet.cancel"),
          text: t("bet.waitingForNextRound"),
          onClick: () => {
            onStopAutoPlay();
            cancelBet();
          },
        };
      case BetButtonVariant.Lost:
        return { label: t("bet.lost"), amount: format(settledAmount) };
      case BetButtonVariant.Freebet:
        return {
          label: t("common.freeBet"),
          amount: format(stake),
          onClick: () => onBet(stake),
        };
      case BetButtonVariant.Bet:
      default:
        return {
          label: t("bet.bet"),
          amount: format(stake),
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
              amount={format(freeround.betAmount)}
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
              min={freeround?.betMin ?? minBet}
              max={
                freeround
                  ? Math.min(freeround.betMax, freeround.balanceRemaining)
                  : maxBet
              }
              step={step}
              disabled={inputsDisabled}
              onValueChange={onBetAmountChange}
            />
          )}

          <div className={styles["bet-area__presets"]}>
            {presets.map((preset) => (
              <AmountButton
                key={preset.key}
                label={preset.label}
                active={betInputAmount === preset.value}
                disabled={inputsDisabled || onFreeBet}
                onClick={() => onBetAmountChange(preset.value)}
              />
            ))}
          </div>
        </div>

        <BetButton
          className={styles["bet-area__bet"]}
          variant={face}
          size={Size.Web}
          label={button.label}
          amount={button.amount}
          text={button.text}
          currency={currency}
          onClick={button.onClick}
          disabled={
            isButtonDisabled || freebetLocked || belowFreebetFloor || !button.onClick
          }
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
             rejected bet. The SDK does not apply this itself. */
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
          onClose={closeAutoModal}
        />
      </Modal>
    </div>
  );
};
