import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Size } from "@/constants";
import { Icon } from "@/components/ui/Icon";
import { Radio } from "@/components/ui/Radio";
import {
  PlayNowButton,
  PlayNowBtnVariants,
} from "@/components/ui/PlayNowButton";
import { useModal, ModalId } from "@/context/ModalProvider";
import { useFreeBets } from "@/hooks";
import { freeBetStore } from "@/game/freeBetStore";
import { isStakeable } from "@/game/freeBets";
import { playSound, Sound } from "@/game/sounds";
import styles from "./FreeBetsContent.module.css";
import { FreeBetCard } from "./FreeBetCard";
import { FREE_BET_GROUP, REAL_MONEY_ID } from "./FreeBetsContent.constants";

/**
 * Body of the "Free bets Management" modal: pick what the next round is staked
 * with — the wallet or one of the active grants — and jump to the archive of
 * spent ones.
 */
export const FreeBetsContent = () => {
  const { t } = useTranslation();
  const { open, close } = useModal();
  const { grants, activeId } = useFreeBets();
  const selected = activeId ?? REAL_MONEY_ID;
  // A set, not a single id: the design opens every card independently.
  const [expanded, setExpanded] = useState<readonly string[]>([]);

  const toggle = (id: string) =>
    setExpanded((open) =>
      open.includes(id) ? open.filter((it) => it !== id) : [...open, id],
    );

  return (
    <div className={styles["free-bets"]}>
      <Radio
        className={styles["free-bets__real"]}
        name={FREE_BET_GROUP}
        value={REAL_MONEY_ID}
        checked={selected === REAL_MONEY_ID}
        onChange={() => freeBetStore.select(null)}
      >
        {t("freeBets.playWithRealMoney")}
      </Radio>

      <h3 className={styles["free-bets__section"]}>
        {t("freeBets.activeFreeBets")}
      </h3>

      <ul className={styles["free-bets__list"]}>
        {grants.map((grant) => (
          <li key={grant.id}>
            <FreeBetCard
              bet={grant}
              checked={selected === grant.id}
              expanded={expanded.includes(grant.id)}
              stakeable={isStakeable(grant)}
              onSelect={freeBetStore.select}
              onToggle={toggle}
            />
          </li>
        ))}
      </ul>

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
