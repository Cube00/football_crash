import { Header } from "../Header";
import { Footer } from "../Footer";
import styles from "./Layout.module.css";
import type { LayoutProps } from "./Layout.types";

/**
 * Where the info panel sits is purely a CSS decision (see Layout.module.css):
 * a left sidebar from 1280 up, stacked under the game below 1024, and hidden in
 * between — where there is room for neither. Keeping it mounted at every width
 * means no resize listener and no remount when a breakpoint is crossed.
 */
export const Layout = ({ header, info, game, footer }: LayoutProps) => {
  return (
    <div className={styles["layout"]}>
      {header ?? <Header />}
      <main className={styles["layout__content"]}>
        <aside className={styles["layout__info"]}>{info}</aside>
        <section className={styles["layout__game"]}>{game}</section>
      </main>
      {footer ?? <Footer />}
    </div>
  );
};
