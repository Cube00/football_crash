import { useCallback, useEffect, useState } from "react";
import { useWinDisplay } from "@/sdk";
import { WIN_NOTIFICATION_MS } from "@/game/display";

export interface WinNotice {
  /** Changes with each win, so the notice remounts and replays its animation. */
  key: number;
  amount: number;
}

/**
 * The player's most recent cashout, held for {@link WIN_NOTIFICATION_MS}.
 *
 * The win itself comes from the SDK (`useWinDisplay`); all this adds is the
 * dismissal timer, which is a presentation decision the SDK has no view on.
 */
export function useWinNotice(): {
  win: WinNotice | null;
  dismiss: () => void;
} {
  const { winAmount, winTimestamp, clearWin } = useWinDisplay();
  const [dismissed, setDismissed] = useState<number | null>(null);

  const showing =
    winAmount != null && winTimestamp != null && dismissed !== winTimestamp;

  useEffect(() => {
    if (!showing || winTimestamp == null) return;
    const timer = setTimeout(() => {
      setDismissed(winTimestamp);
      clearWin();
    }, WIN_NOTIFICATION_MS);
    return () => clearTimeout(timer);
  }, [showing, winTimestamp, clearWin]);

  const dismiss = useCallback(() => {
    setDismissed(winTimestamp);
    clearWin();
  }, [winTimestamp, clearWin]);

  if (!showing || winAmount == null || winTimestamp == null) {
    return { win: null, dismiss };
  }
  return { win: { key: winTimestamp, amount: winAmount }, dismiss };
}
