export const queryKeys = {
  orderbook: (market: string = "BTC") => ["orderbook", market] as const,
  ticker: (market: string = "BTC") => ["ticker", market] as const,
  lastTrade: (market: string = "BTC") => ["lastTrade", market] as const,
  account: (userId: number) => ["account", userId] as const,
  positions: () => ["positions"] as const,
  openOrders: () => ["openOrders"] as const,
  orderHistory: () => ["orderHistory"] as const,
  closedPositions: () => ["closedPositions"] as const,
  fills: () => ["fills"] as const,
};
