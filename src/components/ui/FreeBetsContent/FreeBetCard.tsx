import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { cx, formatDateTime } from "@/utils";
import { Icon } from "@/components/ui/Icon";
import { Radio } from "@/components/ui/Radio";
import { playSound, Sound } from "@/game/sounds";
import { expiryParts, remainingBets, totalBets } from "@/game/freerounds";
import { FreeroundKind } from "@/sdk";
import styles from "./FreeBetCard.module.css";
import {
  FREE_BET_GROUP,
  FreeBetLabel,
  KIND_LABEL_KEYS,
} from "./FreeBetsContent.constants";
import type { FreeBetCardProps } from "./FreeBetsContent.types";

/**
 * One grant in the free bets list: a selectable summary row that unfolds into
 * the accrual terms.
 *
 * Selecting binds the grant on the server; unfolding does not. The two are
 * deliberately separate controls, which is why the chevron sits outside the
 * label — opening the terms must not commit the player to betting with it.
 */
export const FreeBetCard = ({
  grant,
  checked,
  expanded,
  bindable,
  onSelect,
  onToggle,
}: FreeBetCardProps) => {
  const { t, i18n } = useTranslation();
  const detailsId = useId();

  const isRange = grant.kind === FreeroundKind.Range;
  const kindLabel = t(KIND_LABEL_KEYS[grant.kind]);

  // Fixed grants bet one amount; range grants bet anything between two.
  const stake = isRange
    ? `${grant.betMin}–${grant.betMax}`
    : String(grant.betAmount);

  const details = [
    { labelKey: FreeBetLabel.Accrued, value: formatDateTime(grant.accruedAt, i18n.language) },
    { labelKey: FreeBetLabel.MinWithdrawal, value: `${grant.minCashout}x` },
    { labelKey: FreeBetLabel.ExpirationDate, value: expiryText(grant.expiresAt, t, i18n.language) },
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
          value={grant.grantId}
          checked={checked}
          disabled={!bindable}
          onChange={() => onSelect(grant.grantId)}
        >
          <span className={styles["free-bet__fields"]}>
            <Field labelKey={FreeBetLabel.Type} value={kindLabel} />
            <Field
              labelKey={isRange ? FreeBetLabel.BetRange : FreeBetLabel.BetAmount}
              value={stake}
            />
            <Field
              labelKey={FreeBetLabel.Remaining}
              value={`${remainingBets(grant)}/${totalBets(grant)}`}
            />
          </span>
        </Radio>

        <button
          type="button"
          className={styles["free-bet__toggle"]}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={t("freeBets.detailsFor", { type: kindLabel })}
          onClick={() => {
            playSound(Sound.SmallButton);
            onToggle(grant.grantId);
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

/**
 * "Expires in 2d 6h" beats a date the player has to subtract from today, and
 * the largest non-zero unit beats a cascade of zeroes — "30 minutes" is urgent
 * in a way "0 hours" is not. Falls back to the timestamp once it is close
 * enough that the exact moment matters more than the distance.
 */
function expiryText(
  expiresAt: string | undefined,
  t: (key: TranslationKey, options?: Record<string, unknown>) => string,
  locale: string,
): string {
  if (!expiresAt) return "";
  const { days, hours, minutes, expired } = expiryParts(expiresAt);

  if (expired) return t("freeBets.expired");
  if (days >= 1) return t("freeBets.expiresInDays", { days, hours });
  if (hours >= 1) return t("freeBets.expiresInHours", { hours });
  if (minutes >= 1) return t("freeBets.expiresInMinutes", { minutes });
  return formatDateTime(expiresAt, locale);
}

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
