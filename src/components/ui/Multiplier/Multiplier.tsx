import { useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { MultiplierButton, MultiplierButtonVariant } from "../MultiplierButton";
import { Icon } from "../Icon";
import { useCrashHistory } from "@/hooks/useGame";
import {
  useElementWidth,
  useOnClickOutside,
  useOnEscape,
  useWindowSize,
} from "@/hooks";
import { useModal, ModalId } from "@/context/ModalProvider";
import { playSound, Sound } from "@/game/sounds";
import { cx } from "@/utils";
import {
  MAX_MULTIPLIERS,
  PILL_GAP,
  PILL_WIDTH,
  TOGGLE_WIDTH,
  TOUCH_MAX_WIDTH,
  TOUCH_MIN_PILLS,
  TOUCH_PILL_GAP,
  TOUCH_PILL_MIN_WIDTH,
  TOUCH_TOGGLE_WIDTH,
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

/** How many pills of width `pill` fit in `width`, gaps included. */
const pillsThatFit = (width: number, pill: number, gap: number) =>
  Math.max(0, Math.floor((width + gap) / (pill + gap)));

export const Multiplier = () => {
  const history = useCrashHistory();
  const items = history.slice(0, MAX_MULTIPLIERS);

  // The sheet, not the outer box: its content width is the room the pills and
  // the chevron actually share, padding already taken off.
  const sheetRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(sheetRef);
  const rowId = useId();
  const { open: openModal } = useModal();
  const { width: viewport } = useWindowSize();
  const [open, setOpen] = useState(false);

  // Two strips, not one that shrinks: on a phone the pills stretch to share the
  // row and the panel behind them goes away, so the count is the column count.
  const touch = viewport > 0 && viewport <= TOUCH_MAX_WIDTH;
  const pill = touch ? TOUCH_PILL_MIN_WIDTH : PILL_WIDTH;
  const gap = touch ? TOUCH_PILL_GAP : PILL_GAP;
  const toggle = touch ? TOUCH_TOGGLE_WIDTH : TOGGLE_WIDTH;

  // As many as fit stay inline; if that leaves any over, re-fit with the
  // chevron's width reserved so it never sits on top of the last pill.
  const visibleCount = useMemo(() => {
    if (width <= 0) return items.length; // pre-measure: render all, clipped
    if (pillsThatFit(width, pill, gap) >= items.length) return items.length;
    const room = pillsThatFit(width - toggle - gap, pill, gap);
    if (!touch) return room;
    return Math.min(items.length, Math.max(TOUCH_MIN_PILLS, room));
  }, [width, items.length, pill, gap, toggle, touch]);

  const visible = items.slice(0, visibleCount);
  const hasOverflow = visibleCount < items.length;

  // A resize can make every pill fit again; drop a now-stale open state during
  // render so the panel can't spring back when items overflow later. Adjusting
  // state while rendering is React's supported answer to a changed value.
  if (open && !hasOverflow) setOpen(false);

  useOnClickOutside(sheetRef, () => setOpen(false), open);
  useOnEscape(() => setOpen(false), open);

  // Each pill is the entry point to that round's proof: open the details for it
  // and fold the strip back up, so the modal isn't stacked over an open panel.
  const renderPill = (item: (typeof items)[number]) => (
    <MultiplierButton
      key={item.id}
      label={item.multiplier.toFixed(2)}
      size="large"
      variant={variantFor(item.multiplier)}
      aria-haspopup="dialog"
      onClick={() => {
        playSound(Sound.SmallButton);
        setOpen(false);
        openModal(ModalId.PointDetails, item);
      }}
    />
  );

  return (
    <div className={styles["multiplier"]}>
      <div
        ref={sheetRef}
        className={cx(
          styles["multiplier__sheet"],
          open && styles["multiplier__sheet--open"],
        )}
      >
        {/* One row of pills that wraps into a grid when open, rather than a
            second panel dropping out from under the strip. */}
        <div
          id={rowId}
          className={cx(
            styles["multiplier__row"],
            hasOverflow && styles["multiplier__row--fill"],
            open && styles["multiplier__row--open"],
          )}
          // Drives the touch grid: open, the wrapped rows keep the columns the
          // closed strip had, so nothing jumps width when it unfolds.
          style={{ "--columns": visibleCount } as CSSProperties}
        >
          {(open ? items : visible).map(renderPill)}
        </div>

        {hasOverflow && (
          <button
            type="button"
            className={cx(
              styles["multiplier__toggle"],
              open && styles["multiplier__toggle--open"],
            )}
            aria-label={open ? "Hide multipliers" : "Show all multipliers"}
            aria-controls={rowId}
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
      </div>
    </div>
  );
};
