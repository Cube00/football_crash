import { useTranslation } from "react-i18next";
import { cx } from "@/utils";
import { FooterClock } from "./FooterClock";
import styles from "./Footer.module.css";
import type { HTMLAttributes } from "react";

export const Footer = ({ className, ...rest }: HTMLAttributes<HTMLElement>) => {
  const { t } = useTranslation();

  return (
    <footer className={cx(styles["footer"], className)} {...rest}>
      <img
        src="/assets/PoweredBy.webp"
        width={173}
        height={24}
        alt={t("a11y.poweredByLogo")}
      />
      <div className={styles["footer-tols"]}>
        <div className={styles["footer-tools-network"]}>
          <img
            src="/assets/icons/Network.svg"
            width={16}
            height={16}
            alt={t("a11y.network")}
          />
          <span>{t("footer.networkConnection")}</span>
        </div>
        <div className={styles["footer-tools-wraper"]} />
        <FooterClock />
      </div>
    </footer>
  );
};
