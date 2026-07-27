import { useEffect, type RefObject } from "react";

/**
 * Calls `handler` when a pointer press lands outside `ref`, while `active` is
 * true. Useful for dismissing popovers and dropdowns without a backdrop.
 *
 * Listens on `pointerdown` rather than `click` so the dismissal fires before
 * the press turns into a click on whatever was underneath.
 */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;

    const handlePointerDown = (event: PointerEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) handler();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, handler, active]);
}
