import { useMemo, useRef, useState } from "react";
import { MultiplierButton, MultiplierButtonVariant } from "../MultiplierButton";
import { Icon } from "../Icon";
import { useCrashHistory } from "@/hooks/useGame";
import { useElementWidth, useOnClickOutside, useOnEscape } from "@/hooks";
import { playSound, Sound } from "@/game/sounds";
import { cx } from "@/utils";
import {
  MAX_MULTIPLIERS,
  PILL_GAP,
  PILL_WIDTH,
  TOGGLE_WIDTH,
} from "./Multiplier.constants";
import styles from "./Multiplier.module.css";

/** Colour tier for a past round's crash value. Higher crash = hotter colour. */
const variantFor = (multiplier: number): MultiplierButtonVariant => {
  if (multiplier >= 10) return MultiplierButtonVariant.Green;
  if (multiplier >= 5) return MultiplierButtonVariant.Yellow;
  if (multiplier >= 3) return MultiplierButtonVariant.Blue;
  if (multiplier >= 2) return MultiplierButtonVariant.LightBlue;
  return MultiplierButtonVariant.White;
};

/** How many pills of fixed width `PILL_WIDTH` fit in `width`, gaps included. */
const pillsThatFit = (width: number) =>
  Math.max(0, Math.floor((width + PILL_GAP) / (PILL_WIDTH + PILL_GAP)));

export const Multiplier = () => {
  const history = useCrashHistory();
  const items = history.slice(0, MAX_MULTIPLIERS);

  const rowRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(rowRef);
  const [open, setOpen] = useState(false);

  // As many as fit stay inline; if that leaves any over, re-fit with the
  // chevron's width reserved so it never sits on top of the last pill.
  const visibleCount = useMemo(() => {
    if (width <= 0) return items.length; // pre-measure: render all, clipped
    if (pillsThatFit(width) >= items.length) return items.length;
    return pillsThatFit(width - TOGGLE_WIDTH - PILL_GAP);
  }, [width, items.length]);

  const visible = items.slice(0, visibleCount);
  const hidden = items.slice(visibleCount);
  const hasOverflow = hidden.length > 0;

  // A resize can make every pill fit again; drop a now-stale open state during
  // render so the panel can't spring back when items overflow later. Adjusting
  // state while rendering is React's supported answer to a changed value.
  if (open && !hasOverflow) setOpen(false);

  useOnClickOutside(rowRef, () => setOpen(false), open);
  useOnEscape(() => setOpen(false), open);

  const renderPill = (item: (typeof items)[number]) => (
    <MultiplierButton
      key={item.id}
      label={item.multiplier.toFixed(2)}
      size="large"
      variant={variantFor(item.multiplier)}
    />
  );

  return (
    <div className={styles["multiplier"]} ref={rowRef}>
      <div className={styles["multiplier__row"]}>{visible.map(renderPill)}</div>

      {hasOverflow && (
        <button
          type="button"
          className={cx(
            styles["multiplier__toggle"],
            open && styles["multiplier__toggle--open"],
          )}
          aria-label={open ? "Hide multipliers" : "Show more multipliers"}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => {
            playSound(Sound.SmallButton);
            setOpen((value) => !value);
          }}
        >
          <Icon
            className={styles["multiplier__chevron"]}
            src="/assets/icons/Arrow down.svg"
          />
        </button>
      )}

      {open && hasOverflow && (
        <div className={styles["multiplier__dropdown"]} role="menu">
          {hidden.map(renderPill)}
        </div>
      )}
    </div>
  );
};
