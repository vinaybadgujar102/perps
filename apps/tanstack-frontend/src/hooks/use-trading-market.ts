import { useQuery } from "@tanstack/react-query";
import { getOrderbookApi } from "#/api/orderbook.api";
import { useTradingMarket } from "#/contexts/trading-market-context";
import type { TickerData } from "#/hooks/use-market-subscriptions";
import { getLastMidPrice } from "#/lib/trading/order-pricing";
import { queryKeys } from "#/lib/query-keys";

export function useMarketOrderbook() {
  const { market } = useTradingMarket();

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

  const bestBid = orderbookQuery.data?.bestBid?.price ?? null;
  const bestAsk = orderbookQuery.data?.bestAsk?.price ?? null;
  const lastPrice =
    lastTradeQuery.data?.price ??
    getLastMidPrice(bestBid, bestAsk, tickerQuery.data?.indexPrice ?? null);

  return {
    market,
    bestBid,
    bestAsk,
    lastPrice,
    isLoading: orderbookQuery.isLoading,
    isError: orderbookQuery.isError,
    error: orderbookQuery.error,
    refetch: orderbookQuery.refetch,
  };
}
