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
 * The signatures below match the ones the integration docs list, so no call
 * site changes.
 * ─────────────────────────────────────────────────────────────────────────
 */

const MATCH_MEDIA_UNSUPPORTED = () => false;

/**
 * Whether the viewport currently matches `query`.
 *
 * Replaces the skin's old `useWindowSize` + `BREAKPOINT` table, which measured
 * the window and compared numbers by hand. The queries passed in must stay in
 * step with the `@media` rules in the CSS Modules — same values, same units.
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

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    MATCH_MEDIA_UNSUPPORTED,
  );
}

/**
 * Calls `handler` when a pointer press lands outside `ref`, while `enabled`.
 *
 * Listens on `pointerdown` rather than `click` so the dismissal fires before
 * the press turns into a click on whatever was underneath.
 *
 * TODO(sdk): the docs write this as `useClickOutside(ref, handler, ?, ?)` —
 * two further parameters they do not name. Only the first three are used here;
 * check the real signature on install.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) handler();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, handler, enabled]);
}
