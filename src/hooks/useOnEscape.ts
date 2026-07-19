import { useEffect } from "react";

/**
 * Calls `handler` when the Escape key is pressed, while `active` is true.
 * Useful for dismissing modals, drawers, and popovers.
 */
export function useOnEscape(handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handler, active]);
}
