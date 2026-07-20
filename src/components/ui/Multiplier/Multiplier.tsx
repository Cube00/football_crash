import { useMemo } from "react";
import { MultiplierButton, MultiplierButtonVariant } from "../MultiplierButton";
import { MAX_MULTIPLIERS } from "./Multiplier.constants";
import styles from "./Multiplier.module.css";

const VARIANTS = Object.values(MultiplierButtonVariant);

const randomVariant = () =>
  VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

export const Multiplier = () => {
  const variants = useMemo(
    () => Array.from({ length: MAX_MULTIPLIERS }, randomVariant),
    [],
  );

  return (
    <div className={styles["multiplier"]}>
      {variants.map((variant, index) => (
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
