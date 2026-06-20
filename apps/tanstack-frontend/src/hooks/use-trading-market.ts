import { useQuery } from "@tanstack/react-query";
import { getOrderbookApi } from "#/api/orderbook.api";
import type { TickerData } from "#/hooks/use-market-subscriptions";
import { TRADING_MARKET } from "#/lib/market";
import { getLastMidPrice } from "#/lib/trading/order-pricing";
import { queryKeys } from "#/lib/query-keys";

export function useTradingMarket() {
  const orderbookQuery = useQuery({
    queryKey: queryKeys.orderbook(),
    queryFn: () => getOrderbookApi(TRADING_MARKET),
  });

  const tickerQuery = useQuery({
    queryKey: queryKeys.ticker(),
    queryFn: () => null as TickerData | null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const lastTradeQuery = useQuery({
    queryKey: queryKeys.lastTrade(),
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
    bestBid,
    bestAsk,
    lastPrice,
    isLoading: orderbookQuery.isLoading,
    isError: orderbookQuery.isError,
    error: orderbookQuery.error,
    refetch: orderbookQuery.refetch,
  };
}
