import type { BetRow } from "./BetsList.types";

export const BetsListVariant = {
  All: "all",
  My: "my",
} as const;

export type BetsListVariant =
  (typeof BetsListVariant)[keyof typeof BetsListVariant];

export const BetStatus = {
  Pending: "pending",
  CashedOut: "cashedOut",
  Lost: "lost",
} as const;

export type BetStatus = (typeof BetStatus)[keyof typeof BetStatus];

export const BETS_LIST_DEFAULTS = {
  currency: "USD",
  emptyValue: "-",
} as const;

export const MOCK_BETS: BetRow[] = [
  { id: "1", player: "G****t", bet: 20, status: BetStatus.Pending, own: true },
  {
    id: "2",
    player: "G****t",
    bet: 10,
    status: BetStatus.CashedOut,
    multiplier: 244.62,
    cashout: 1.5,
    own: true,
  },
  { id: "3", player: "K****5", bet: 15.5, status: BetStatus.Pending },
  {
    id: "4",
    player: "T****h",
    bet: 10,
    status: BetStatus.CashedOut,
    multiplier: 244.62,
    cashout: 1.5,
  },
  {
    id: "5",
    player: "T****h",
    bet: 6,
    status: BetStatus.CashedOut,
    multiplier: 244.62,
    cashout: 1.5,
  },
  {
    id: "6",
    player: "T****h",
    bet: 5.4,
    status: BetStatus.CashedOut,
    multiplier: 244.62,
    cashout: 1.5,
  },
  { id: "7", player: "L****r", bet: 6.5, status: BetStatus.Pending },
  { id: "8", player: "K****5", bet: 10.5, status: BetStatus.Pending },
  { id: "9", player: "O****i", bet: 12, status: BetStatus.Pending },
  { id: "10", player: "O****i", bet: 20, status: BetStatus.Pending },
  { id: "11", player: "F****3", bet: 2.5, status: BetStatus.Pending },
  { id: "12", player: "F****3", bet: 2.5, status: BetStatus.Pending },
  { id: "13", player: "F****3", bet: 2.5, status: BetStatus.Pending },
];

const cashedOut = (id: string, bet: number): BetRow => ({
  id,
  date: "5.12.2025",
  time: "13:35",
  bet,
  status: BetStatus.CashedOut,
  multiplier: 244.62,
  cashout: 1.5,
  own: true,
});

const lost = (id: string, bet: number): BetRow => ({
  id,
  date: "5.12.2025",
  time: "13:35",
  bet,
  status: BetStatus.Lost,
  own: true,
});

export const MOCK_MY_BETS: BetRow[] = [
  lost("1", 20),
  cashedOut("2", 10),
  cashedOut("3", 15.5),
  lost("4", 10),
  cashedOut("5", 6),
  lost("6", 5.4),
  cashedOut("7", 6.5),
  lost("8", 10.5),
  cashedOut("9", 12),
  lost("10", 20),
  lost("11", 2.5),
  lost("12", 2.5),
  lost("13", 2.5),
];
