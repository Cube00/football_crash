import type { HTMLAttributes } from "react";
import type { TabsVariant } from "./Tabs.constants";

export interface TabItem {
  label: string;
  value: string;
}

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
}
