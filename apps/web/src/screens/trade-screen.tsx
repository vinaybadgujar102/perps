import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ChartPanel } from "../components/chart-panel";
import { MarketHeader } from "../components/market-header";
import { MarketsSidebar } from "../components/markets-sidebar";
import { OrderbookPanel } from "../components/orderbook-panel";
import { TradePanel } from "../components/trade-panel";
import { fetchMarket, fetchMarkets, fetchOrderbook } from "../lib/api";

const TradeComponent = () => {
  const { symbol } = useParams({ from: "/trade/$symbol" });
  const marketsQuery = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets });
  const marketQuery = useQuery({ queryKey: ["market", symbol], queryFn: () => fetchMarket(symbol) });
  const orderbookQuery = useQuery({
    queryKey: ["orderbook", symbol],
    queryFn: () => fetchOrderbook(symbol),
    refetchInterval: 2500,
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
              orderbook={orderbookQuery.data ?? null}
              priceScale={market.priceScale}
              quantityScale={market.quantityScale}
              isLoading={orderbookQuery.isLoading}
              onRetry={() => void orderbookQuery.refetch()}
              error={orderbookQuery.error ? "Unable to fetch orderbook data" : null}
            />
            <TradePanel />
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
