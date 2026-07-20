import { Header } from "../Header";
import { Footer } from "../Footer";
import styles from "./Layout.module.css";
import type { LayoutProps } from "./Layout.types";
import { useWindowSize } from "@/hooks";

export const Layout = ({ header, info, game, footer }: LayoutProps) => {
  const { width } = useWindowSize();

  return (
    <div className={styles["layout"]}>
      {header ?? <Header />}
      <main className={styles["layout__content"]}>
        {width > 1279 && (
          <aside className={styles["layout__info"]}>{info}</aside>
        )}
        <section className={styles["layout__game"]}>{game}</section>
      </main>
      {footer ?? <Footer />}
    </div>
  );
};
