import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getOrderbookApi } from "#/api/orderbook.api";
import { MarketSelectModal } from "#/components/common/market-select-modal";
import { useTradingMarket } from "#/contexts/trading-market-context";
import type { TickerData } from "#/hooks/use-market-subscriptions";
import { queryKeys } from "#/lib/query-keys";

const MARKET_STATS: Record<
  string,
  { change: string; high: string; low: string }
> = {
  BTC: {
    change: "+529.7 (+0.86%)",
    high: "62,400.0",
    low: "60,700.0",
  },
  SOL: {
    change: "+2.4 (+1.63%)",
    high: "152.8",
    low: "145.2",
  },
};

function formatPrice(value: number, priceScale: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: priceScale,
    maximumFractionDigits: priceScale,
  });
}

function formatScaledPrice(raw: number, priceScale: number) {
  return formatPrice(raw / 10 ** priceScale, priceScale);
}

function formatIndexPrice(
  ticker: TickerData | undefined,
  priceScale: number,
) {
  if (!ticker) return "—";
  return formatScaledPrice(ticker.indexPrice, priceScale);
}

export function MarketHeader() {
  const { market, setMarket, markets, config } = useTradingMarket();
  const { priceScale } = config;
  const stats = MARKET_STATS[market] ?? MARKET_STATS.BTC;
  const [marketModalOpen, setMarketModalOpen] = useState(false);

  const orderbookQuery = useQuery({
    queryKey: queryKeys.orderbook(market),
    queryFn: () => getOrderbookApi(market),
  });

  const tickerQuery = useQuery({
    queryKey: queryKeys.ticker(market),
    queryFn: () => null as TickerData | null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const lastTradeQuery = useQuery({
    queryKey: queryKeys.lastTrade(market),
    queryFn: () => null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const lastTradedPrice =
    lastTradeQuery.data?.price != null
      ? lastTradeQuery.data.price / 10 ** priceScale
      : orderbookQuery.data?.bestBid && orderbookQuery.data?.bestAsk
        ? (orderbookQuery.data.bestBid.price +
            orderbookQuery.data.bestAsk.price) /
          2 /
          10 ** priceScale
        : null;

  return (
    <>
      <div className="border-b border-border bg-surface/30 p-6">
        <div className="flex flex-wrap items-end gap-x-12 gap-y-4">
          <div className="relative">
            <span className="display-xl pointer-events-none absolute -top-6 left-0 select-none opacity-[0.03]">
              {market}
            </span>
            <button
              type="button"
              onClick={() => setMarketModalOpen(true)}
              className="headline-lg cursor-pointer font-extrabold tracking-tighter transition-colors hover:text-accent"
              aria-haspopup="dialog"
              aria-expanded={marketModalOpen}
            >
              {market} / USD
            </button>
          </div>

          <span className="font-mono text-4xl font-extrabold tracking-tighter">
            {lastTradedPrice !== null
              ? formatPrice(lastTradedPrice, priceScale)
              : "—"}
          </span>

          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="flex flex-col">
              <span className="mono-label mb-1 text-input-label">
                24h Change
              </span>
              <span className="font-mono text-trading-green">{stats.change}</span>
            </div>
            <div className="flex flex-col">
              <span className="mono-label mb-1 text-input-label">24h High</span>
              <span className="font-mono text-foreground">{stats.high}</span>
            </div>
            <div className="flex flex-col">
              <span className="mono-label mb-1 text-input-label">24h Low</span>
              <span className="font-mono text-foreground">{stats.low}</span>
            </div>
            <div className="flex flex-col">
              <span className="mono-label mb-1 text-input-label">
                Index Price
              </span>
              <span className="font-mono text-foreground">
                {formatIndexPrice(tickerQuery.data ?? undefined, priceScale)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <MarketSelectModal
        open={marketModalOpen}
        onOpenChange={setMarketModalOpen}
        selectedMarket={market}
        markets={markets}
        onSelect={setMarket}
      />
    </>
  );
}
