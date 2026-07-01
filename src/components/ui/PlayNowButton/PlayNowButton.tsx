import { cx } from "@/utils";
import styles from "./PlayNowButton.module.css";
import type { PlayNowButtonProps } from "./PlayNowButton.types";

export const PlayNowButton = ({
  variant,
  size,
  className,
}: PlayNowButtonProps) => {
  const classes = cx(
    styles["playnow-button"],
    styles[`playnow-button--${variant}`],
    styles[`playnow-button--${size}`],
    className,
  );

  return (
    <button className={classes}>
      <span>Play Now</span>
    </button>
  );
};
