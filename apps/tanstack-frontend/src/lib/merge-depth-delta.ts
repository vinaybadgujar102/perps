import type { OrderbookData, OrderbookLevel } from "#/api/orderbook.api";

type DepthDeltaPayload = {
  market: string;
  timestamp: number;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
};

function applySideUpdates(
  levels: OrderbookLevel[],
  updates: OrderbookLevel[],
  sort: "desc" | "asc",
): OrderbookLevel[] {
  const map = new Map(levels.map((level) => [level.price, level.qty]));

  for (const { price, qty } of updates) {
    if (qty === 0) {
      map.delete(price);
    } else {
      map.set(price, qty);
    }
  }

  return [...map.entries()]
    .map(([price, qty]) => ({ price, qty }))
    .sort((a, b) => (sort === "desc" ? b.price - a.price : a.price - b.price))
    .slice(0, 10);
}

export function mergeDepthDelta(
  current: OrderbookData | undefined,
  delta: DepthDeltaPayload,
): OrderbookData {
  const bids = applySideUpdates(current?.bids ?? [], delta.bids, "desc");
  const asks = applySideUpdates(current?.asks ?? [], delta.asks, "asc");

  return {
    bids,
    asks,
    bestBid: bids[0] ?? null,
    bestAsk: asks[0] ?? null,
  };
}
