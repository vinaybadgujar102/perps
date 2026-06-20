import { useQuery } from "@tanstack/react-query";
import { getOrderbookApi } from "#/api/orderbook.api";
import { Button } from "#/components/ui/button";
import { useTradingMarket } from "#/contexts/trading-market-context";
import { cn } from "#/lib/utils";
import { queryKeys } from "#/lib/query-keys";

type OrderbookLevel = {
  price: number;
  size: number;
};

type DisplayLevel = OrderbookLevel & {
  total: number;
  depthPct: number;
};

function scalePrice(value: number, priceScale: number) {
  return value / 10 ** priceScale;
}

function scaleSize(value: number, quantityScale: number) {
  return value / 10 ** quantityScale;
}

function toDisplayLevels(
  levels: { price: number; qty: number }[],
  priceScale: number,
  quantityScale: number,
): OrderbookLevel[] {
  return levels.map((level) => ({
    price: scalePrice(level.price, priceScale),
    size: scaleSize(level.qty, quantityScale),
  }));
}

function withCumulativeTotals(levels: OrderbookLevel[]): DisplayLevel[] {
  let running = 0;
  let maxTotal = 0;

  const withTotals = levels.map((level) => {
    running += level.size;
    maxTotal = Math.max(maxTotal, running);
    return { ...level, total: running, depthPct: 0 };
  });

  return withTotals.map((level) => ({
    ...level,
    depthPct: maxTotal > 0 ? (level.total / maxTotal) * 100 : 0,
  }));
}

function formatPrice(value: number, priceScale: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: priceScale,
    maximumFractionDigits: priceScale,
  });
}

function formatSize(value: number, quantityScale: number) {
  return value.toFixed(quantityScale);
}

function OrderbookRow({
  level,
  side,
  priceScale,
  quantityScale,
}: {
  level: DisplayLevel;
  side: "ask" | "bid";
  priceScale: number;
  quantityScale: number;
}) {
  return (
    <div className="relative grid grid-cols-3 gap-2 px-2 py-0.5 font-mono text-[11px]">
      <div
        className={cn(
          "absolute inset-y-0 right-0",
          side === "ask" ? "bg-accent/15" : "bg-trading-green/15",
        )}
        style={{ width: `${level.depthPct}%` }}
      />
      <span
        className={cn(
          "relative z-10 tabular-nums",
          side === "ask" ? "text-accent" : "text-trading-green",
        )}
      >
        {formatPrice(level.price, priceScale)}
      </span>
      <span className="relative z-10 text-right tabular-nums text-foreground">
        {formatSize(level.size, quantityScale)}
      </span>
      <span className="relative z-10 text-right tabular-nums text-foreground">
        {formatSize(level.total, quantityScale)}
      </span>
    </div>
  );
}

export function OrderbookPanel() {
  const { market, config } = useTradingMarket();
  const { priceScale, quantityScale } = config;

  const orderbookQuery = useQuery({
    queryKey: queryKeys.orderbook(market),
    queryFn: () => getOrderbookApi(market),
  });

  const lastTradeQuery = useQuery({
    queryKey: queryKeys.lastTrade(market),
    queryFn: () => null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const asks = withCumulativeTotals(
    toDisplayLevels(orderbookQuery.data?.asks ?? [], priceScale, quantityScale),
  );
  const bids = withCumulativeTotals(
    toDisplayLevels(orderbookQuery.data?.bids ?? [], priceScale, quantityScale),
  );

  const lastTradedPrice =
    lastTradeQuery.data?.price != null
      ? scalePrice(lastTradeQuery.data.price, priceScale)
      : orderbookQuery.data?.bestBid && orderbookQuery.data?.bestAsk
        ? (scalePrice(orderbookQuery.data.bestBid.price, priceScale) +
            scalePrice(orderbookQuery.data.bestAsk.price, priceScale)) /
          2
        : null;

  return (
    <section className="flex w-96 shrink-0 flex-col border-r border-border bg-surface/10">
      <div className="flex shrink-0 border-b border-border tracking-wider">
        <Button className="flex-1 bg-surface font-bold">ORDER BOOK</Button>
        <Button className="flex-1 bg-surface font-bold" disabled>
          RECENT TRADES
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-2 grid grid-cols-3 gap-2 px-2 text-[9px] text-input-label tracking-wider">
          <span>PRICE (USD)</span>
          <span className="text-right">SIZE ({market})</span>
          <span className="text-right">TOTAL ({market})</span>
        </div>

        {orderbookQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center text-input-label mono-label text-xs">
            Loading orderbook...
          </div>
        ) : orderbookQuery.isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-input-label mono-label text-xs">
              {orderbookQuery.error instanceof Error
                ? orderbookQuery.error.message
                : "Failed to load orderbook"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void orderbookQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col-reverse justify-start overflow-hidden">
              {asks.map((level) => (
                <OrderbookRow
                  key={level.price}
                  level={level}
                  side="ask"
                  priceScale={priceScale}
                  quantityScale={quantityScale}
                />
              ))}
            </div>

            <div className="my-2 border-y border-border py-2 text-center font-mono text-2xl font-bold text-trading-green">
              {lastTradedPrice !== null ? formatPrice(lastTradedPrice, priceScale) : "--"}
            </div>

            <div className="flex flex-1 flex-col justify-start overflow-hidden">
              {bids.map((level) => (
                <OrderbookRow
                  key={level.price}
                  level={level}
                  side="bid"
                  priceScale={priceScale}
                  quantityScale={quantityScale}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
