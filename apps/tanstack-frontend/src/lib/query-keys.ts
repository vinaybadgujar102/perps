export const queryKeys = {
  orderbook: (market: string) => ["orderbook", market] as const,
  ticker: (market: string) => ["ticker", market] as const,
  lastTrade: (market: string) => ["lastTrade", market] as const,
  candles: (market: string, interval: string) =>
    ["candles", market, interval] as const,
  account: (userId: number) => ["account", userId] as const,
  positions: () => ["positions"] as const,
  openOrders: () => ["openOrders"] as const,
  orderHistory: () => ["orderHistory"] as const,
  deposits: () => ["deposits"] as const,
  closedPositions: () => ["closedPositions"] as const,
  fills: () => ["fills"] as const,
};
