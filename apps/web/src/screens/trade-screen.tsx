import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ChartPanel } from "../components/chart-panel";
import { MarketHeader } from "../components/market-header";
import { MarketsSidebar } from "../components/markets-sidebar";
import { OrderbookPanel } from "../components/orderbook-panel";
import { TradePanel } from "../components/trade-panel";
import { fetchMarket, fetchMarkets, fetchOrderbook } from "../lib/api";

const TradeComponent = () => {
  const { symbol } = useParams({ from: "/trade/$symbol" });
  const queryClient = useQueryClient();
  const marketsQuery = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets });
  const marketQuery = useQuery({ queryKey: ["market", symbol], queryFn: () => fetchMarket(symbol) });
  const orderbookQuery = useQuery({
    queryKey: ["orderbook", symbol],
    queryFn: () => fetchOrderbook(symbol),
  });

  const market = marketQuery.data;
  const markets = marketsQuery.data ?? [];
  const lastPrice = useMemo(() => {
    if (!orderbookQuery.data?.bestAsk || !orderbookQuery.data?.bestBid) return null;
    return (orderbookQuery.data.bestAsk.price + orderbookQuery.data.bestBid.price) / 2;
  }, [orderbookQuery.data]);

  if (marketQuery.isLoading || !market) return <main className="screen-state">Loading market...</main>;
  if (marketQuery.error) {
    return <main className="screen-state error">Failed to load symbol `{symbol}`.</main>;
  }

  return (
    <main className="trade-main">
      <div className="trade-body">
        <MarketsSidebar markets={markets} activeSymbol={market.symbol} />
        <section className="trade-content">
          <MarketHeader market={market} lastPrice={lastPrice} />
          <div className="trade-grid">
            <ChartPanel />
            <OrderbookPanel
              symbol={market.symbol}
              orderbook={orderbookQuery.data ?? null}
              priceScale={market.priceScale}
              quantityScale={market.quantityScale}
              lastPrice={lastPrice}
              isLoading={orderbookQuery.isLoading}
              onRetry={() => void orderbookQuery.refetch()}
              error={orderbookQuery.error ? "Unable to fetch orderbook data" : null}
            />
            <TradePanel
              market={market}
              lastPrice={lastPrice}
              bestBid={orderbookQuery.data?.bestBid?.price ?? null}
              bestAsk={orderbookQuery.data?.bestAsk?.price ?? null}
              onOrderPlaced={() => {
                void orderbookQuery.refetch();
                void queryClient.invalidateQueries({ queryKey: ["account"] });
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export const TradeRouteView = {
  Component: TradeComponent,
  fetchMarkets,
  fetchMarket,
};
