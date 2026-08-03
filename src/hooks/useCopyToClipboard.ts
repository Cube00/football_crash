import { useCallback, useEffect, useRef, useState } from "react";

/** How long the copied flag stays raised before it clears itself. */
export const COPIED_FEEDBACK_MS = 1600;

/**
 * Writes text to the clipboard and raises a flag the caller can show a note on.
 *
 * The async Clipboard API is not always reachable: it needs a secure context,
 * and inside an iframe it also needs a `clipboard-write` permission policy the
 * host page has to grant. This game is meant to be embedded in a lobby, so that
 * is a live case rather than a theoretical one — hence the `execCommand`
 * fallback, deprecated but still the only thing that works there.
 */
export function useCopyToClipboard(resetMs = COPIED_FEEDBACK_MS) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      if (!(await write(text))) return false;

      setCopied(id);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}

async function write(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyWrite(text);
  }
}

/** Selection-based copy, for the contexts the Clipboard API is denied in. */
function legacyWrite(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  // Off-screen rather than hidden — `display: none` cannot hold a selection,
  // and scrolling to a focused field would jump the modal.
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-9999px";
  document.body.appendChild(field);

  try {
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
