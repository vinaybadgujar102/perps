export type OrderbookLevel = {
  price: number;
  qty: number;
};

export type DisplayLevel = OrderbookLevel & {
  total: number;
  depthPct: number;
};

export const ORDERBOOK_LEVELS = 10;

export const withCumulativeTotals = (levels: OrderbookLevel[]): DisplayLevel[] => {
  let running = 0;
  let maxTotal = 0;

  const withTotals = levels.map((level) => {
    running += level.qty;
    maxTotal = Math.max(maxTotal, running);
    return { ...level, total: running, depthPct: 0 };
  });

  return withTotals.map((level) => ({
    ...level,
    depthPct: maxTotal > 0 ? (level.total / maxTotal) * 100 : 0,
  }));
};
