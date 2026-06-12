import { AssetConfig } from "@repo/sharedtypes";
import { useQuery } from "@tanstack/react-query";
import { getOrderbookApi } from "#/api/orderbook.api";
import type { TickerData } from "#/hooks/use-market-subscriptions";

const MARKET = "BTC";
const { priceScale } = AssetConfig[MARKET];

const MARKET_STATS = {
  pair: "BTC / USD",
  watermark: "BTC",
  change: "+529.7 (+0.86%)",
  high: "62,400.0",
  low: "60,700.0",
};

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: priceScale,
    maximumFractionDigits: priceScale,
  });
}

function formatScaledPrice(raw: number) {
  return formatPrice(raw / 10 ** priceScale);
}

function formatIndexPrice(ticker: TickerData | undefined) {
  if (!ticker) return "—";
  return formatScaledPrice(ticker.indexPrice);
}

export function MarketHeader() {
  const orderbookQuery = useQuery({
    queryKey: ["orderbook", MARKET],
    queryFn: () => getOrderbookApi(MARKET),
  });

  const tickerQuery = useQuery({
    queryKey: ["ticker", MARKET],
    queryFn: () => null as TickerData | null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const lastTradedPrice =
    orderbookQuery.data?.bestBid && orderbookQuery.data?.bestAsk
      ? (orderbookQuery.data.bestBid.price + orderbookQuery.data.bestAsk.price) /
        2 /
        10 ** priceScale
      : null;

  return (
    <div className="border-b border-border bg-surface/30 p-6">
      <div className="flex flex-wrap items-end gap-x-12 gap-y-4">
        <div className="relative">
          <span className="display-xl pointer-events-none absolute -top-6 left-0 select-none opacity-[0.03]">
            {MARKET_STATS.watermark}
          </span>
          <h1 className="headline-lg font-extrabold tracking-tighter">
            {MARKET_STATS.pair}
          </h1>
        </div>

        <span className="font-mono text-4xl font-extrabold tracking-tighter">
          {lastTradedPrice !== null ? formatPrice(lastTradedPrice) : "—"}
        </span>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h Change</span>
            <span className="font-mono text-trading-green">
              {MARKET_STATS.change}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h High</span>
            <span className="font-mono text-foreground">{MARKET_STATS.high}</span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h Low</span>
            <span className="font-mono text-foreground">{MARKET_STATS.low}</span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">Index Price</span>
            <span className="font-mono text-foreground">
              {formatIndexPrice(tickerQuery.data ?? undefined)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
