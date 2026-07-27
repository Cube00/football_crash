import { useState } from "react";
import { Size } from "@/constants";
import { Icon } from "@/components/ui/Icon";
import { Radio } from "@/components/ui/Radio";
import {
  PlayNowButton,
  PlayNowBtnVariants,
} from "@/components/ui/PlayNowButton";
import { useModal, ModalId } from "@/context/ModalProvider";
import { playSound, Sound } from "@/game/sounds";
import styles from "./FreeBetsContent.module.css";
import { FreeBetCard } from "./FreeBetCard";
import {
  ACTIVE_FREE_BETS,
  FREE_BET_GROUP,
  REAL_MONEY_ID,
} from "./FreeBetsContent.constants";

/**
 * Body of the "Free bets Management" modal: pick what the next round is staked
 * with — the wallet or one of the active grants — and jump to the archive of
 * spent ones.
 */
export const FreeBetsContent = () => {
  const { open } = useModal();
  const [selected, setSelected] = useState<string>(REAL_MONEY_ID);
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
        onChange={() => setSelected(REAL_MONEY_ID)}
      >
        Play with real money
      </Radio>

      <h3 className={styles["free-bets__section"]}>Active Free Bets</h3>

      <ul className={styles["free-bets__list"]}>
        {ACTIVE_FREE_BETS.map((bet) => (
          <li key={bet.id}>
            <FreeBetCard
              bet={bet}
              checked={selected === bet.id}
              expanded={expanded.includes(bet.id)}
              onSelect={setSelected}
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
          Archive
        </button>

        <PlayNowButton
          className={styles["free-bets__play"]}
          variant={PlayNowBtnVariants.Orange}
          size={Size.Mobile}
        />
      </div>
    </div>
  );
};
