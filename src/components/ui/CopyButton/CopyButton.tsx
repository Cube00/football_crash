import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { Icon } from "@/components/ui/Icon";
import styles from "./CopyButton.module.css";
import type { CopyButtonProps } from "./CopyButton.types";

/**
 * Copies a value and says so.
 *
 * The copied state is owned by the caller, not by this button — two of them can
 * share one {@link useCopyToClipboard}, and copying the seed then clears the
 * note on the hash rather than leaving two claiming to be the last one copied.
 */
export const CopyButton = ({
  value,
  copied = false,
  onCopy,
  label,
  size = 20,
  className,
}: CopyButtonProps) => {
  const { t } = useTranslation();

  return (
    <span className={cx(styles["copy-button"], className)}>
      <button
        type="button"
        className={cx(
          styles["copy-button__trigger"],
          copied && styles["copy-button__trigger--copied"],
        )}
        onClick={() => onCopy(value)}
        aria-label={label ?? t("a11y.copy")}
      >
        <Icon
          src={copied ? "/assets/icons/Check.svg" : "/assets/icons/Copy.svg"}
          size={size}
        />
      </button>

      {copied && (
        <span className={styles["copy-button__note"]} role="status">
          {t("common.copied")}
        </span>
      )}
    </span>
  );
};
