import { useSyncExternalStore } from "react";

type WindowSize = {
  width: number;
  height: number;
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange, { passive: true });
  return () => window.removeEventListener("resize", onChange);
};

let cachedSize: WindowSize = { width: 0, height: 0 };

const getSnapshot = (): WindowSize => {
  if (
    cachedSize.width !== window.innerWidth ||
    cachedSize.height !== window.innerHeight
  ) {
    cachedSize = { width: window.innerWidth, height: window.innerHeight };
  }

  return cachedSize;
};

const getServerSnapshot = (): WindowSize => cachedSize;

export const useWindowSize = (): WindowSize =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
