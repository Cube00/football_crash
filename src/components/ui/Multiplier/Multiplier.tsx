import { MultiplierButton, MultiplierButtonVariant } from "../MultiplierButton";
import { useCrashHistory } from "@/hooks/useGame";
import { MAX_MULTIPLIERS } from "./Multiplier.constants";
import styles from "./Multiplier.module.css";

/** Colour tier for a past round's crash value. Higher crash = hotter colour. */
const variantFor = (multiplier: number): MultiplierButtonVariant => {
  if (multiplier >= 10) return MultiplierButtonVariant.Green;
  if (multiplier >= 5) return MultiplierButtonVariant.Yellow;
  if (multiplier >= 3) return MultiplierButtonVariant.Blue;
  if (multiplier >= 2) return MultiplierButtonVariant.LightBlue;
  return MultiplierButtonVariant.White;
};

export const Multiplier = () => {
  const history = useCrashHistory();
  const items = history.slice(0, MAX_MULTIPLIERS);

  return (
    <div className={styles["multiplier"]}>
      {items.map((item) => (
        <MultiplierButton
          key={item.id}
          label={item.multiplier.toFixed(2)}
          size="large"
          variant={variantFor(item.multiplier)}
        />
      ))}
    </div>
  );
};
