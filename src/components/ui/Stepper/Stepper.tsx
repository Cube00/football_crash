import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { cx } from "@/utils";
import { MinusButton } from "../MinusButton";
import { PlusButton } from "../PlusButton";
import styles from "./Stepper.module.css";
import { STEPPER_DEFAULTS, StepperSize } from "./Stepper.constants";
import type { StepperProps } from "./Stepper.types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const MinusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" width="16" height="16" aria-hidden="true">
    <path
      d="M3.33337 8H12.6667"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" width="16" height="16" aria-hidden="true">
    <path
      d="M8 3.33337V12.6667M3.33337 8H12.6667"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Stepper = ({
  value,
  defaultValue = STEPPER_DEFAULTS.defaultValue,
  min = STEPPER_DEFAULTS.min,
  max = STEPPER_DEFAULTS.max,
  step = STEPPER_DEFAULTS.step,
  precision = STEPPER_DEFAULTS.precision,
  size = StepperSize.Default,
  suffix = "",
  disabled = false,
  onValueChange,
  className,
  ...rest
}: StepperProps) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    clamp(defaultValue, min, max),
  );
  const currentValue = isControlled ? value : internalValue;

  // Raw text held while the user is typing; null when not editing.
  const [draft, setDraft] = useState<string | null>(null);

  const update = (next: number) => {
    const clamped = clamp(next, min, max);
    if (!isControlled) setInternalValue(clamped);
    onValueChange?.(clamped);
    return clamped;
  };

  const decrease = () => update(currentValue - step);
  const increase = () => update(currentValue + step);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    // allow only numbers, an optional leading minus, and a single dot
    if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
      setDraft(raw);
    }
  };

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number.parseFloat(draft);
    update(Number.isNaN(parsed) ? currentValue : parsed);
    setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitDraft();
      event.currentTarget.blur();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      increase();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      decrease();
    }
  };

  const displayValue =
    draft !== null
      ? draft
      : `${currentValue.toFixed(precision)}${suffix}`;

  const isCompact = size === StepperSize.Compact;
  const decreaseDisabled = disabled || currentValue <= min;
  const increaseDisabled = disabled || currentValue >= max;

  return (
    <div
      className={cx(
        styles["stepper"],
        styles[`stepper--${size}`],
        className,
      )}
      {...rest}
    >
      {isCompact ? (
        <button
          type="button"
          aria-label="Decrease"
          className={cx(
            styles["stepper__icon-button"],
            styles["stepper__icon-button--minus"],
          )}
          onClick={decrease}
          disabled={decreaseDisabled}
        >
          <MinusIcon />
        </button>
      ) : (
        <MinusButton onClick={decrease} disabled={decreaseDisabled} />
      )}

      <input
        className={styles["stepper__value"]}
        type="text"
        inputMode="decimal"
        value={displayValue}
        disabled={disabled}
        onChange={handleChange}
        onBlur={commitDraft}
        onKeyDown={handleKeyDown}
        onFocus={(event) => {
          setDraft(currentValue.toFixed(precision));
          event.target.select();
        }}
      />

      {isCompact ? (
        <button
          type="button"
          aria-label="Increase"
          className={cx(
            styles["stepper__icon-button"],
            styles["stepper__icon-button--plus"],
          )}
          onClick={increase}
          disabled={increaseDisabled}
        >
          <PlusIcon />
        </button>
      ) : (
        <PlusButton onClick={increase} disabled={increaseDisabled} />
      )}
    </div>
  );
};
