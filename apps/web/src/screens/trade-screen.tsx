import { ChartPanel } from "@/components/chart-panel";
import { MarketHeader } from "@/components/market-header";
import { MarketsSidebar } from "@/components/markets-sidebar";
import { OpenPositionsPanel } from "@/components/open-positions-panel";
import { OrderbookPanel } from "@/components/orderbook-panel";
import { TradePanel } from "@/components/trade-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMarket, useMarket } from "@/hooks/queries/use-market";
import { fetchMarkets, useMarkets } from "@/hooks/queries/use-markets";
import { useOrderbook } from "@/hooks/queries/use-orderbook";
import { fetchOpenPositions, usePositions } from "@/hooks/queries/use-positions";
import { useIndexPriceSubscription } from "@/hooks/use-index-prices";
import { useAuth } from "@/stores/auth-store";
import { useIndexPrices } from "@/stores/index-price-store";
import { useParams } from "@tanstack/react-router";
import { List } from "lucide-react";
import { useMemo } from "react";

const TradeComponent = () => {
  const { symbol } = useParams({ from: "/trade/$symbol" });
  const { user, isAuthenticated } = useAuth();
  const marketsQuery = useMarkets();
  const marketQuery = useMarket(symbol);
  const orderbookQuery = useOrderbook(symbol);
  const positionsQuery = usePositions(user?.id, isAuthenticated);

  const market = marketQuery.data;
  const markets = marketsQuery.data ?? [];

  const watchedMarkets = useMemo(() => {
    const symbols = new Set<string>([symbol]);
    for (const position of positionsQuery.data ?? []) {
      symbols.add(position.market);
    }
    return [...symbols];
  }, [symbol, positionsQuery.data]);

  useIndexPriceSubscription(watchedMarkets);
  const indexPrices = useIndexPrices();

  const lastPrice = useMemo(() => {
    if (!orderbookQuery.data?.bestAsk || !orderbookQuery.data?.bestBid) return null;
    return (orderbookQuery.data.bestAsk.price + orderbookQuery.data.bestBid.price) / 2;
  }, [orderbookQuery.data]);

  const markPrice = indexPrices[market?.symbol ?? symbol] ?? null;

  const handleOrderPlaced = () => {
    void orderbookQuery.refetch();
    void positionsQuery.refetch();
  };

  if (marketQuery.isLoading || !market) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (marketQuery.error) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load symbol {symbol}.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void marketQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  const tradePanel = (
    <TradePanel
      market={market}
      lastPrice={lastPrice}
      bestBid={orderbookQuery.data?.bestBid?.price ?? null}
      bestAsk={orderbookQuery.data?.bestAsk?.price ?? null}
      onOrderPlaced={handleOrderPlaced}
    />
  );

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <div className="grid gap-3 p-3 lg:grid-cols-[270px_minmax(0,1fr)_320px]">
        <MarketsSidebar
          markets={markets}
          activeSymbol={market.symbol}
          className="hidden lg:flex"
        />

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <List className="size-4" aria-hidden="true" />
                  Markets
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle>Markets</SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <MarketsSidebar
                    markets={markets}
                    activeSymbol={market.symbol}
                    className="min-h-0 border-0 bg-transparent p-0"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <MarketHeader market={market} markPrice={markPrice} />

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
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
          </div>

          <div className="lg:hidden">{tradePanel}</div>

          <OpenPositionsPanel
            positions={positionsQuery.data ?? []}
            activeSymbol={market.symbol}
            markets={markets}
            indexPrices={indexPrices}
            isLoading={positionsQuery.isLoading}
            error={positionsQuery.error ? "Unable to fetch positions" : null}
            onRetry={() => void positionsQuery.refetch()}
            isAuthenticated={isAuthenticated}
          />
        </section>

        <div className="hidden lg:block">{tradePanel}</div>
      </div>
    </main>
  );
};

export const TradeRouteView = {
  Component: TradeComponent,
  fetchMarkets,
  fetchMarket,
  fetchOpenPositions,
};
