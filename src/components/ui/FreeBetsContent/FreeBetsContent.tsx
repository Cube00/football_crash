import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Size } from "@/constants";
import { Icon } from "@/components/ui/Icon";
import { Radio } from "@/components/ui/Radio";
import {
  PlayNowButton,
  PlayNowBtnVariants,
} from "@/components/ui/PlayNowButton";
import { useModal, ModalId } from "@/context/ModalProvider";
import { FreeroundStatus, useFreerounds } from "@/sdk";
import { remainingBets } from "@/game/freerounds";
import { playSound, Sound } from "@/game/sounds";
import styles from "./FreeBetsContent.module.css";
import { FreeBetCard } from "./FreeBetCard";
import { FREE_BET_GROUP, REAL_MONEY_ID } from "./FreeBetsContent.constants";

/**
 * Body of the "Free bets Management" modal: choose what the next round is
 * staked with — the wallet or one of the granted free bets — and jump to the
 * archive of spent ones.
 *
 * Binding is a server call, not a local flag: only one grant can be
 * `IN_PROGRESS` at a time and the server decides which, so selecting a row asks
 * for it rather than setting it.
 */
export const FreeBetsContent = () => {
  const { t } = useTranslation();
  const { open, close } = useModal();
  const { grants, state, bind, unbind, refresh } = useFreerounds();

  // Refreshed once, on open. `GetFreerounds` is heavy server-side and the SDK
  // mirrors balance and rounds locally on every change, so the list is already
  // live — this is the reconciliation the docs ask for, not a poll.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = state?.isActive ? state.grantId : REAL_MONEY_ID;
  // A set, not a single id: the design opens every card independently.
  const [expanded, setExpanded] = useState<readonly string[]>([]);

  const toggle = (id: string) =>
    setExpanded((rows) =>
      rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id],
    );

  return (
    <div className={styles["free-bets"]}>
      <Radio
        className={styles["free-bets__real"]}
        name={FREE_BET_GROUP}
        value={REAL_MONEY_ID}
        checked={selected === REAL_MONEY_ID}
        onChange={() => unbind()}
      >
        {t("freeBets.playWithRealMoney")}
      </Radio>

      <h3 className={styles["free-bets__section"]}>
        {t("freeBets.activeFreeBets")}
      </h3>

      {grants.length === 0 ? (
        <p className={styles["free-bets__empty"]}>
          {t("freeBets.noneAvailable")}
        </p>
      ) : (
        <ul className={styles["free-bets__list"]}>
          {grants.map((grant) => (
            <li key={grant.grantId}>
              <FreeBetCard
                grant={grant}
                checked={selected === grant.grantId}
                expanded={expanded.includes(grant.grantId)}
                bindable={
                  grant.status === FreeroundStatus.Available &&
                  remainingBets(grant) > 0
                }
                onSelect={bind}
                onToggle={toggle}
              />
            </li>
          ))}
        </ul>
      )}

      <div className={styles["free-bets__footer"]}>
        <button
          type="button"
          className={styles["free-bets__archive"]}
          onClick={() => {
            playSound(Sound.SmallButton);
            open(ModalId.Archive);
          }}
        >
          <Icon src="/assets/icons/History.svg" size={16} />
          {t("freeBets.archive")}
        </button>

        <PlayNowButton
          className={styles["free-bets__play"]}
          variant={PlayNowBtnVariants.Orange}
          size={Size.Mobile}
          onClick={close}
        />
      </div>
    </div>
  );
};
