import { TRADING_MARKET } from "#/lib/market";

export const queryKeys = {
  orderbook: (market: string = TRADING_MARKET) => ["orderbook", market] as const,
  ticker: (market: string = TRADING_MARKET) => ["ticker", market] as const,
  lastTrade: (market: string = TRADING_MARKET) => ["lastTrade", market] as const,
  account: (userId: number) => ["account", userId] as const,
  positions: () => ["positions"] as const,
  openOrders: () => ["openOrders"] as const,
  orderHistory: () => ["orderHistory"] as const,
  closedPositions: () => ["closedPositions"] as const,
  fills: () => ["fills"] as const,
};
