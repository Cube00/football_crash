import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { Size } from "@/constants";
import { Stepper, StepperSize } from "../Stepper";
import { AmountButton } from "../AmountButton";
import { BetButton, BetButtonVariant } from "../BetButton";
import { Toggle } from "../Toggle";
import { Modal, ModalWidth } from "../Modal";
import { useModal, ModalId } from "@/context/ModalProvider";
import { AutoBetContent } from "./AutoBetContent";
import { usePhase, useSlot, useBalance } from "@/hooks/useGame";
import { useTick } from "@/hooks/useTick";
import { useAutoPlay } from "@/hooks/useAutoPlay";
import { useActiveFreeBet } from "@/hooks";
import { gameActions } from "@/game/actions";
import { BetState, GamePhase } from "@/game/enums";
import { FreeBetPayout, remainingOf } from "@/game/freeBets";
import { GAME_CONFIG } from "@/game/config";
import { loadState, saveBetAmount } from "@/game/persistence";
import { FreeBetAmount } from "./FreeBetAmount";
import styles from "./BetArea.module.css";
import { AMOUNT_PRESETS, BET_AREA_DEFAULTS } from "./BetArea.constants";
import type { BetAreaProps } from "./BetArea.types";

export const BetArea = ({
  slot,
  currency = BET_AREA_DEFAULTS.currency,
  className,
  ...rest
}: BetAreaProps) => {
  const { t } = useTranslation();
  const { open } = useModal();
  const phase = usePhase();
  const slotState = useSlot(slot);
  const balance = useBalance();
  const { multiplier } = useTick();
  // Staked grant, shared by both slots — it is a choice of wallet, not of slot.
  const freeBet = useActiveFreeBet();

  const [amount, setAmount] = useState(
    () => loadState().betAmounts[slot] ?? GAME_CONFIG.defaultBet,
  );
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const freeBetsLeft = freeBet ? remainingOf(freeBet) : 0;
  // A staked grant dictates the stake; the player's own amount waits its turn.
  const stake = freeBet?.price ?? amount;
  const [showAutoModal, setShowAutoModal] = useState(false);
  const closeAutoModal = () => setShowAutoModal(false);

  useEffect(() => {
    saveBetAmount(slot, amount);
  }, [slot, amount]);

  // placeBet reads live values via refs so auto-play can call it any time.
  const amountRef = useRef(amount);
  const autoCashoutRef = useRef<number | undefined>(undefined);

  const freeBetRef = useRef<string | undefined>(undefined);

  const placeBet = useCallback(() => {
    gameActions.placeBet(
      slot,
      amountRef.current,
      currency,
      autoCashoutRef.current,
      freeBetRef.current,
    );
  }, [slot, currency]);

  const autoPlay = useAutoPlay({ slot, placeBet });

  // Sync the refs after render (never write refs during render).
  useEffect(() => {
    amountRef.current = stake;
    freeBetRef.current = freeBet ? freeBet.id : undefined;
    autoCashoutRef.current = autoPlay.config.autoCashOut.enabled
      ? autoPlay.config.autoCashOut.multiplier
      : undefined;
  });

  // Auto-play started on a grant keeps spending that grant. When the grant is
  // gone the store unstakes it, and the run has to end there — the next round
  // would otherwise quietly reach for the player's own money.
  const startedOnFreeBet = useRef(false);
  const { isActive: autoRunning, stop: stopAutoPlay } = autoPlay;

  useEffect(() => {
    if (!autoRunning) {
      startedOnFreeBet.current = Boolean(freeBet);
      return;
    }
    if (startedOnFreeBet.current && !freeBet) stopAutoPlay();
  }, [autoRunning, freeBet, stopAutoPlay]);

  const selectPreset = (preset: number, index: number) => {
    setAmount(preset);
    setActivePreset(index);
  };

  const inBettingWindow =
    phase === GamePhase.BettingOpen || phase === GamePhase.BettingClosing;

  const autoActive = autoPlay.isActive;

  const stopAutoBet = () => {
    autoPlay.stop();
    if (
      slotState.state === BetState.Placed ||
      slotState.state === BetState.Queued
    ) {
      gameActions.cancelBet(slot);
    }
  };

  // What cashing out right now would credit. Pure profit grants keep the
  // stake, so only what it earned lands on the button.
  const payoutAt = (at: number) => {
    const factor = Math.max(1, at);
    const earned =
      freeBet?.payout === FreeBetPayout.PureProfit ? factor - 1 : factor;
    return slotState.amount * earned;
  };

  // ── Derive the primary button from phase + bet state ──
  const { state } = slotState;
  // The label is always "Bet"; only the behaviour changes by phase — inside the
  // window it places now, outside it queues a pre-bet for the next round.
  // A staked grant replaces the wallet: the stake is the grant's and the only
  // thing that can run out is the grant itself.
  let variant: BetButtonVariant = freeBet
    ? BetButtonVariant.Freebet
    : BetButtonVariant.Bet;
  let label = freeBet ? t("common.freeBet") : t("bet.bet");
  let buttonAmount: string | undefined = freeBet
    ? String(stake)
    : stake.toFixed(2);
  let buttonText: string | undefined;
  let onClick = placeBet;
  let disabled = freeBet
    ? freeBetsLeft <= 0
    : amount <= 0 || amount > balance;

  if (state === BetState.Active) {
    // A live flying bet — cash out (auto-play keeps running afterwards).
    variant = BetButtonVariant.Cashout;
    label = t("bet.cashOut");
    buttonAmount = payoutAt(multiplier).toFixed(2);
    onClick = () => gameActions.cashout(slot);
    disabled = phase !== GamePhase.Flying;
  } else if (state === BetState.Queued) {
    // Pre-bet awaiting the next round — a cancel action with a waiting sub-line.
    variant = BetButtonVariant.Cancel;
    label = t("bet.cancel");
    buttonAmount = undefined;
    buttonText = t("bet.waitingForNextRound");
    onClick = autoActive ? stopAutoBet : () => gameActions.cancelBet(slot);
    disabled = false;
  } else if (state === BetState.Placed) {
    variant = BetButtonVariant.Cancel;
    label = t("bet.cancel");
    buttonAmount = slotState.amount.toFixed(2);
    onClick = autoActive ? stopAutoBet : () => gameActions.cancelBet(slot);
    disabled = !inBettingWindow;
  } else if (autoActive) {
    // Auto-play is running but this slot has no live bet yet (idle / just
    // won / just lost) — the button becomes a "stop auto-play" control rather
    // than letting a manual bet slip in.
    variant = BetButtonVariant.Cancel;
    label = t("bet.cancel");
    buttonAmount = undefined;
    buttonText = t("bet.waitingForNextRound");
    onClick = stopAutoBet;
    disabled = false;
  }

  // Anything but a plain "Bet" means the slot is committed — flying, placed,
  // queued, or held by auto-play. The stake and the auto settings are what that
  // bet was struck on, so they freeze until the round resolves; the primary
  // button, now Cash Out or Cancel, is the only live control left.
  const betLocked = variant !== BetButtonVariant.Bet;

  const toggleAutoBet = (checked: boolean) => {
    if (checked) {
      setShowAutoModal(true);
    } else {
      autoPlay.stop();
      setShowAutoModal(false);
    }
  };

  const setAutoCashout = (patch: { enabled?: boolean; multiplier?: number }) =>
    autoPlay.updateConfig({
      autoCashOut: { ...autoPlay.config.autoCashOut, ...patch },
    });

  return (
    <div
      className={cx(
        styles["bet-area"],
        freeBet && styles["bet-area--freebet"],
        className,
      )}
      {...rest}
    >
      <div className={styles["bet-area__top"]}>
        <div className={styles["bet-area__controls"]}>
          {freeBet ? (
            <FreeBetAmount
              className={styles["bet-area__stepper"]}
              price={String(freeBet.price)}
              currency={freeBet.currency}
              remaining={freeBetsLeft}
              total={freeBet.total}
              aria-label={t("modals.betType")}
              onClick={() => open(ModalId.BetType)}
            />
          ) : (
            <Stepper
              className={styles["bet-area__stepper"]}
              value={amount}
              min={0}
              step={1}
              disabled={betLocked}
              onValueChange={(next) => {
                setAmount(next);
                setActivePreset(null);
              }}
            />
          )}

          <div className={styles["bet-area__presets"]}>
            {AMOUNT_PRESETS.map((preset, index) => (
              <AmountButton
                key={preset.value}
                label={preset.labelKey ? t(preset.labelKey) : preset.label!}
                active={activePreset === index}
                disabled={betLocked || Boolean(freeBet)}
                onClick={() => selectPreset(preset.value, index)}
              />
            ))}
          </div>
        </div>

        <BetButton
          className={styles["bet-area__bet"]}
          variant={variant}
          size={Size.Web}
          label={label}
          amount={buttonAmount}
          text={buttonText}
          currency={currency}
          onClick={onClick}
          disabled={disabled}
        />
      </div>

      <div className={styles["bet-area__bottom"]}>
        <div className={styles["bet-area__togglesection"]}>
          <label
            className={cx(
              styles["bet-area__toggle"],
              betLocked && styles["bet-area__toggle--disabled"],
            )}
          >
            <span className={styles["bet-area__toggle-label"]}>
              {t("bet.autoBet")}
            </span>
            <Toggle
              checked={showAutoModal || autoPlay.isActive}
              disabled={betLocked}
              onChange={(event) => toggleAutoBet(event.target.checked)}
            />
          </label>
          <label
            className={cx(
              styles["bet-area__toggle"],
              betLocked && styles["bet-area__toggle--disabled"],
            )}
          >
            <span className={styles["bet-area__toggle-label"]}>
              {t("bet.autoCashOut")}
            </span>
            <Toggle
              checked={autoPlay.config.autoCashOut.enabled}
              disabled={betLocked}
              onChange={(event) =>
                setAutoCashout({ enabled: event.target.checked })
              }
            />
          </label>
        </div>
        <Stepper
          className={styles["bet-area__multiplier"]}
          size={StepperSize.Compact}
          value={autoPlay.config.autoCashOut.multiplier}
          min={1.01}
          step={0.5}
          precision={2}
          suffix="x"
          disabled={betLocked}
          onValueChange={(next) => setAutoCashout({ multiplier: next })}
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
