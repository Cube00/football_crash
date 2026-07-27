/** Total pills in the set. As many as fit stay on the row; the rest collapse
    into the chevron dropdown, so this just needs to cover the widest case. */
export const MAX_MULTIPLIERS = 15;

/* Geometry the fit calculation needs, mirroring the CSS. A pill is fixed-width,
   so how many fit on the row is arithmetic rather than a per-frame measurement.
   Keep these in step with MultiplierButton.module.css and Multiplier.module.css. */

/** Width of one `large` pill, from `.multiplier-button--large`. */
export const PILL_WIDTH = 67;
/** Gap between pills / row items, from `--size-4`. */
export const PILL_GAP = 4;
/** Width reserved for the chevron toggle when the row overflows. */
export const TOGGLE_WIDTH = 24;
