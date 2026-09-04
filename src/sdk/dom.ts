import { useEffect, useSyncExternalStore } from "react";
import type { RefObject } from "react";

/**
 * Browser utilities that `@krash/react` also ships.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TEMPORARY, like the rest of `src/sdk` — but unlike `hooks.ts` these are
 * implemented rather than inert, and the distinction is deliberate.
 *
 * `hooks.ts` returns nothing because the values it stands for are *server*
 * state, and inventing them would be simulating a backend. A media query and an
 * outside-click listener are neither: they read the browser, they have no
 * session, and there is nothing about them to fake. A stub that returned
 * `false` and a no-op would not be honest emptiness — it would silently break
 * the mobile layout and leave popovers unable to close.
 *
 * On install this file is deleted and the two names come from the SDK:
 *
 *     export { useMediaQuery, useClickOutside } from "@krash/react";
 *
 * Signatures match `.claude/sdk-docs/06-hooks-reference.md`, so no call site
 * changes.
 * ─────────────────────────────────────────────────────────────────────────
 */

const MATCH_MEDIA_UNSUPPORTED = () => false;

/**
 * Whether the viewport currently matches `query`.
 *
 * Replaces the skin's old `useWindowSize` + `BREAKPOINT` table, which measured
 * the window and compared numbers by hand. The queries passed in must stay in
 * step with the `@media` rules in the CSS Modules — same values, same units.
 *
 * The SDK's version is `useState(false)` + an effect, so it reports `false` on
 * the first render and the real value on the second. This one subscribes
 * instead and is right immediately; anything that would flash under the SDK's
 * version must not depend on the difference. For the device class use
 * `useDevice()` — it decides synchronously on both sides of the seam.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const list = window.matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  };

  const getSnapshot = () =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false;

  return useSyncExternalStore(subscribe, getSnapshot, MATCH_MEDIA_UNSUPPORTED);
}

/**
 * Calls `handler` when a press lands outside `ref`, while `enabled`.
 *
 * `mousedown` + `touchstart`, as the SDK does: the dismissal fires before the
 * press turns into a click on whatever was underneath. `excludeRefs` is for
 * elements that are visually outside the panel but must not close it — a
 * trigger button that does its own toggling, typically. Memoise both `handler`
 * and the array, or the listener re-registers on every render.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true,
  excludeRefs?: RefObject<HTMLElement | null>[],
) {
  useEffect(() => {
    if (!enabled) return;

    const onPress = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (excludeRefs?.some((excluded) => excluded.current?.contains(target))) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", onPress);
    document.addEventListener("touchstart", onPress);
    return () => {
      document.removeEventListener("mousedown", onPress);
      document.removeEventListener("touchstart", onPress);
    };
  }, [ref, handler, enabled, excludeRefs]);
}
