import type { User } from "./types";

export const USERS: Map<number, User> = new Map();

export const orderbooks: Record<
  string,
  { bids: []; asks: []; indexPrice: number }
> = {
  BTC: { bids: [], asks: [], indexPrice: 0 },
  SOL: { bids: [], asks: [], indexPrice: 0 },
};
