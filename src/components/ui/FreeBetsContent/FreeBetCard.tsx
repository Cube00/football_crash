import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { cx } from "@/utils";
import { Icon } from "@/components/ui/Icon";
import { Radio } from "@/components/ui/Radio";
import { playSound, Sound } from "@/game/sounds";
import styles from "./FreeBetCard.module.css";
import { FREE_BET_GROUP, FreeBetLabel } from "./FreeBetsContent.constants";
import type { FreeBetCardProps } from "./FreeBetsContent.types";

/**
 * One grant in the free bets list: a selectable summary row that unfolds into
 * the accrual terms.
 *
 * Selecting and unfolding are deliberately separate controls — the chevron sits
 * outside the label so opening the terms does not stake the bet.
 */
export const FreeBetCard = ({
  bet,
  checked,
  expanded,
  onSelect,
  onToggle,
}: FreeBetCardProps) => {
  const { t } = useTranslation();
  const detailsId = useId();

  const details = [
    { labelKey: FreeBetLabel.Accrued, value: bet.accrued },
    { labelKey: FreeBetLabel.MinWithdrawal, value: bet.minWithdrawal },
    { labelKey: FreeBetLabel.ExpirationDate, value: bet.expiresAt },
  ];

  return (
    <div
      className={cx(
        styles["free-bet"],
        expanded && styles["free-bet--expanded"],
      )}
    >
      <div className={styles["free-bet__head"]}>
        <Radio
          className={styles["free-bet__select"]}
          name={FREE_BET_GROUP}
          value={bet.id}
          checked={checked}
          onChange={() => onSelect(bet.id)}
        >
          <span className={styles["free-bet__fields"]}>
            <Field labelKey={FreeBetLabel.Type} value={t(bet.typeKey)} />
            <Field labelKey={FreeBetLabel.BetAmount} value={bet.betAmount} />
            {bet.betPrice && (
              <Field labelKey={FreeBetLabel.BetPrice} value={bet.betPrice} />
            )}
          </span>
        </Radio>

        <button
          type="button"
          className={styles["free-bet__toggle"]}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={t("freeBets.detailsFor", { type: t(bet.typeKey) })}
          onClick={() => {
            playSound(Sound.SmallButton);
            onToggle(bet.id);
          }}
        >
          <Icon
            className={styles["free-bet__chevron"]}
            src="/assets/icons/Arrow down.svg"
          />
        </button>
      </div>

      <dl
        id={detailsId}
        className={styles["free-bet__details"]}
        hidden={!expanded}
      >
        {details.map(({ labelKey, value }) => (
          <div key={labelKey} className={styles["free-bet__detail"]}>
            <dt className={styles["free-bet__label"]}>{t(labelKey)}</dt>
            <dd className={styles["free-bet__detail-value"]}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const Field = ({
  labelKey,
  value,
}: {
  labelKey: TranslationKey;
  value: string;
}) => {
  const { t } = useTranslation();

  return (
    <span className={styles["free-bet__field"]}>
      <span className={styles["free-bet__label"]}>{t(labelKey)}</span>
      <span className={styles["free-bet__value"]}>{value}</span>
    </span>
  );
};
