export const queryKeys = {
  markets: ["markets"] as const,
  market: (symbol: string) => ["market", symbol] as const,
  orderbook: (symbol: string) => ["orderbook", symbol] as const,
  account: (userId: number) => ["account", userId] as const,
  positions: ["positions"] as const,
};
