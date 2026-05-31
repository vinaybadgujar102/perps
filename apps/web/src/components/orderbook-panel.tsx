import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderbookData } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ORDERBOOK_LEVELS,
  withCumulativeTotals,
  type DisplayLevel,
} from "@/lib/orderbook-utils";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

type OrderbookPanelProps = {
  symbol: string;
  orderbook: OrderbookData | null;
  priceScale: number;
  quantityScale: number;
  lastPrice: number | null;
  isLoading: boolean;
  onRetry: () => void;
  error: string | null;
};

const OrderbookRow = ({
  level,
  side,
  priceScale,
  quantityScale,
}: {
  level: DisplayLevel;
  side: "bid" | "ask";
  priceScale: number;
  quantityScale: number;
}) => (
  <div className="relative grid grid-cols-3 gap-2 px-2 py-0.5 text-xs" role="row">
    <span
      className={cn(
        "relative z-10 font-mono tabular-nums",
        side === "bid" ? "text-primary" : "text-destructive",
      )}
    >
      {formatNumber(level.price, priceScale)}
    </span>
    <span className="relative z-10 font-mono tabular-nums">
      {formatNumber(level.qty, quantityScale)}
    </span>
    <span className="relative z-10 text-right font-mono tabular-nums">
      <span
        className={cn(
          "absolute inset-y-0 right-0 opacity-20",
          side === "bid" ? "bg-primary" : "bg-destructive",
        )}
        style={{ width: `${level.depthPct}%` }}
        aria-hidden="true"
      />
      {formatNumber(level.total, quantityScale)}
    </span>
  </div>
);

export const OrderbookPanel = ({
  symbol,
  orderbook,
  priceScale,
  quantityScale,
  lastPrice,
  isLoading,
  onRetry,
  error,
}: OrderbookPanelProps) => {
  const { asks, bids } = useMemo(() => {
    const rawAsks = orderbook?.asks.slice(0, ORDERBOOK_LEVELS) ?? [];
    const rawBids = orderbook?.bids.slice(0, ORDERBOOK_LEVELS) ?? [];

    return {
      asks: withCumulativeTotals([...rawAsks].reverse()),
      bids: withCumulativeTotals(rawBids),
    };
  }, [orderbook]);

  const midPrice =
    lastPrice ??
    (orderbook?.bestAsk && orderbook?.bestBid
      ? (orderbook.bestAsk.price + orderbook.bestBid.price) / 2
      : null);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Orderbook
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-0 p-0 pb-3">
        <div className="grid grid-cols-3 gap-2 px-4 pb-2 text-xs text-muted-foreground">
          <span>Price (USD)</span>
          <span>Size ({symbol})</span>
          <span className="text-right">Total ({symbol})</span>
        </div>

        {isLoading ? (
          <div className="space-y-1 px-4" aria-live="polite" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center" aria-live="assertive">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="flex flex-col">
              {asks.length === 0 ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">No asks</p>
              ) : (
                asks.map((level) => (
                  <OrderbookRow
                    key={`ask-${level.price}`}
                    level={level}
                    side="ask"
                    priceScale={priceScale}
                    quantityScale={quantityScale}
                  />
                ))
              )}
            </div>

            <div className="my-1 border-y border-border py-2 text-center font-mono text-sm font-medium tabular-nums">
              {midPrice !== null ? formatNumber(midPrice, priceScale) : "--"}
            </div>

            <div className="flex flex-col">
              {bids.length === 0 ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">No bids</p>
              ) : (
                bids.map((level) => (
                  <OrderbookRow
                    key={`bid-${level.price}`}
                    level={level}
                    side="bid"
                    priceScale={priceScale}
                    quantityScale={quantityScale}
                  />
                ))
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
