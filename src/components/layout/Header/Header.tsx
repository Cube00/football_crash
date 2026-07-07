import { cx } from "@/utils";
import styles from "./Header.module.css";
import type { HTMLAttributes } from "react";

export const Header = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement>) => {
  return (
    <header className={cx(styles["header"], className)} {...rest}>
      {children}
    </header>
  );
};
