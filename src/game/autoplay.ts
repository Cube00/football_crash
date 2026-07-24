export interface StopCondition {
  enabled: boolean;
  amount: number;
}

export interface AutoPlayConfig {
  /** Re-bet automatically each round while active. */
  autoBet: boolean;
  /** Number of rounds to run; `Infinity` for endless. */
  rounds: number;
  autoCashOut: {
    enabled: boolean;
    multiplier: number;
  };
  stopOnCashDecrease: StopCondition;
  stopOnCashIncrease: StopCondition;
  stopOnSingleWin: StopCondition;
}

export const AutoPlayStopReason = {
  Completed: "COMPLETED",
  CashDecreased: "CASH_DECREASED",
  CashIncreased: "CASH_INCREASED",
  SingleWinExceeded: "SINGLE_WIN_EXCEEDED",
  ManualStop: "MANUAL_STOP",
} as const;

export type AutoPlayStopReason =
  (typeof AutoPlayStopReason)[keyof typeof AutoPlayStopReason];

/** Preset round counts offered in the auto-play UI. */
export const ROUND_OPTIONS = [10, 20, 50, 100] as const;

export const DEFAULT_AUTO_PLAY_CONFIG: AutoPlayConfig = {
  autoBet: false,
  rounds: 10,
  autoCashOut: { enabled: false, multiplier: 2 },
  stopOnCashDecrease: { enabled: false, amount: 0 },
  stopOnCashIncrease: { enabled: false, amount: 0 },
  stopOnSingleWin: { enabled: false, amount: 0 },
};
