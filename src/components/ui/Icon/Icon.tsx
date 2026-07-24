import type { CSSProperties } from "react";
import { cx } from "@/utils";
import styles from "./Icon.module.css";
import type { IconProps } from "./Icon.types";

/**
 * Paints an SVG file as a mask filled with `currentColor`, rather than dropping
 * it in an `<img>`.
 *
 * Every icon in the set hardcodes its own stroke colour, so an `<img>` can only
 * ever be the grey it was drawn in. Masking uses the file's alpha and takes the
 * colour from the surrounding text, which is what lets one file cover the grey,
 * white and hover states the menu needs.
 */
export const Icon = ({ src, size, className, style, ...rest }: IconProps) => {
  const vars = {
    "--icon-src": `url("${encodeURI(src)}")`,
    ...(size ? { "--icon-size": `${size}px` } : null),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className={cx(styles["icon"], className)}
      style={{ ...vars, ...style }}
      {...rest}
    />
  );
};
