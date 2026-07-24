import type { HTMLAttributes } from "react";

export interface MultiplierValueProps extends HTMLAttributes<HTMLDivElement> {
  /** Already formatted to 2 decimals, e.g. `"1.07"`. */
  value: string;
  /** Round busted: the number turns red. */
  crashed?: boolean;
}
