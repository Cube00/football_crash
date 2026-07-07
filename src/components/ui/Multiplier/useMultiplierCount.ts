import { useEffect, useState } from "react";
import {
  DEFAULT_MULTIPLIER_COUNT,
  MULTIPLIER_BREAKPOINTS,
} from "./Multiplier.constants";

const countForWidth = (width: number) =>
  MULTIPLIER_BREAKPOINTS.find((breakpoint) => width >= breakpoint.minWidth)
    ?.count ?? DEFAULT_MULTIPLIER_COUNT;

/** Returns how many multiplier pills fit the current viewport width. */
export const useMultiplierCount = () => {
  const [count, setCount] = useState<number>(DEFAULT_MULTIPLIER_COUNT);

  useEffect(() => {
    const update = () => setCount(countForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
};
