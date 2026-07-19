import { cx } from "@/utils";
import { FooterClock } from "./FooterClock";
import styles from "./Footer.module.css";
import type { HTMLAttributes } from "react";

export const Footer = ({ className, ...rest }: HTMLAttributes<HTMLElement>) => {
  return (
    <footer className={cx(styles["footer"], className)} {...rest}>
      <img src="/assets/PoweredBy.png" alt="footer logo" />
      <div className={styles["footer-tols"]}>
        <div className={styles["footer-tools-network"]}>
          <img src="/assets/icons/Network.svg" alt="network" />
          <span>Network Connection</span>
        </div>
        <div className={styles["footer-tools-wraper"]} />
        <FooterClock />
      </div>
    </footer>
  );
};
