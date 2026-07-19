import { useCurrentTime } from "@/hooks";
import styles from "./Footer.module.css";

export const FooterClock = () => {
  const time = useCurrentTime();

  return <div className={styles["footer-tools-time"]}>{time}</div>;
};
