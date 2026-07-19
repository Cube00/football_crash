import { useState } from "react";
import { cx } from "@/utils";
import styles from "./Tabs.module.css";
import { TabsVariant } from "./Tabs.constants";
import type { TabsProps } from "./Tabs.types";

export const Tabs = ({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = TabsVariant.Segmented,
  className,
  ...rest
}: TabsProps) => {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value,
  );
  const activeValue = value ?? internalValue;

  const selectTab = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <div
      className={cx(styles["tabs"], styles[`tabs--${variant}`], className)}
      role="tablist"
      {...rest}
    >
      {items.map((item) => {
        const active = item.value === activeValue;

        return (
          <button
            key={item.value}
            className={cx(
              styles["tabs__tab"],
              active && styles["tabs__tab--active"],
            )}
            role="tab"
            aria-selected={active}
            onClick={() => selectTab(item.value)}
          >
            <span className={styles["tabs__label"]}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
