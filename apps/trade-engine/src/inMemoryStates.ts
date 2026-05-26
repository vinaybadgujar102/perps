import type { PriceLevel } from "./types";

export const orderbooks: Record<
  string,
  { bids: PriceLevel[]; asks: PriceLevel[]; indexPrice: number }
> = {
  BTC: { bids: [], asks: [], indexPrice: 0 },
  SOL: { bids: [], asks: [], indexPrice: 0 },
};
