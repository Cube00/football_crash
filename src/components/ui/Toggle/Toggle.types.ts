import type { InputHTMLAttributes } from "react";

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
}
