import { useMemo } from "react";
import {
  MultiplierButton,
  MultiplierButtonVariant,
} from "../MultiplierButton";
import { MAX_MULTIPLIERS } from "./Multiplier.constants";
import { useMultiplierCount } from "./useMultiplierCount";
import styles from "./Multiplier.module.css";

const VARIANTS = Object.values(MultiplierButtonVariant);

const randomVariant = () =>
  VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

export const Multiplier = () => {
  const count = useMultiplierCount();

  // Pre-generate the max set once so colors stay stable while resizing.
  const variants = useMemo(
    () => Array.from({ length: MAX_MULTIPLIERS }, randomVariant),
    [],
  );

  return (
    <div className={styles["multiplier"]}>
      {variants.slice(0, count).map((variant, index) => (
        <MultiplierButton
          key={index}
          label="2.67"
          size="large"
          variant={variant}
        />
      ))}
    </div>
  );
};
