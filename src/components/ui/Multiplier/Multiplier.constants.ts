/** Rounds the strip covers. As many as fit stay on the row; the chevron
    unwraps the whole set, so this is the store's history cap. */
export const MAX_MULTIPLIERS = 30;

/* Geometry the fit calculation needs, mirroring the CSS. Keep these in step
   with Multiplier.module.css and MultiplierButton.module.css. */

/** Viewport the strip switches to its touch layout at. */
export const TOUCH_MAX_WIDTH = 1023;

/* Once the row overflows the pills stretch to share it, so both widths below
   are minimums — how narrow a pill may get before the row drops one — not the
   width they render at. */

/** Desktop: pills on a panel, from `.multiplier-button--large`. */
export const PILL_WIDTH = 67;
export const PILL_GAP = 4;
export const TOGGLE_WIDTH = 24;

/** Touch: no panel, taller pills. */
export const TOUCH_PILL_MIN_WIDTH = 112;
export const TOUCH_PILL_GAP = 6;
export const TOUCH_TOGGLE_WIDTH = 32;
/** Floor for very narrow phones, where stretching beats showing two rounds. */
export const TOUCH_MIN_PILLS = 4;
