import { cx } from "@/utils";
import styles from "./Footer.module.css";
import type { HTMLAttributes } from "react";

export const Footer = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement>) => {
  return (
    <footer className={cx(styles["footer"], className)} {...rest}>
      {children}
    </footer>
  );
};
