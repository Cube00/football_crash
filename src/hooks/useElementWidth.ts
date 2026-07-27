import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * The content-box width of `ref`'s element, kept in sync via a ResizeObserver.
 *
 * `contentRect.width` excludes padding, so the value is the room actually
 * available to lay children out in. Starts at 0 until the first measurement.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
