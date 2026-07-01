import type { Candle, CandleInterval } from "@repo/sharedtypes";
import type { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, type RefObject } from "react";
import type { LastTradeData } from "#/hooks/use-market-subscriptions";
import {
  applyTradeToBar,
  unscaleTradePrice,
} from "#/lib/chart/candle-bucket";
import { queryKeys } from "#/lib/query-keys";

type UseLiveCandleUpdatesOptions = {
  seriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  market: string;
  interval: CandleInterval;
  priceScale: number;
  historicalCandles: Candle[];
};

export function useLiveCandleUpdates({
  seriesRef,
  market,
  interval,
  priceScale,
  historicalCandles,
}: UseLiveCandleUpdatesOptions) {
  const lastTradeQuery = useQuery({
    queryKey: queryKeys.lastTrade(market),
    queryFn: () => null as LastTradeData | null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const lastFillIdRef = useRef<string | null>(null);
  const formingBarRef = useRef<Candle | null>(null);

  useEffect(() => {
    lastFillIdRef.current = null;
    formingBarRef.current =
      historicalCandles[historicalCandles.length - 1] ?? null;
  }, [market, interval, historicalCandles]);

  useEffect(() => {
    const trade = lastTradeQuery.data;
    const series = seriesRef.current;
    if (!trade || trade.market !== market || !series) return;
    if (trade.fillId === lastFillIdRef.current) return;

    lastFillIdRef.current = trade.fillId;
    const tradePrice = unscaleTradePrice(trade.price, priceScale);
    const nextBar = applyTradeToBar(
      formingBarRef.current,
      tradePrice,
      trade.timestamp,
      interval,
    );

    formingBarRef.current = nextBar;
    series.update({
      ...nextBar,
      time: nextBar.time as UTCTimestamp,
    });
  }, [
    lastTradeQuery.data,
    market,
    interval,
    priceScale,
    seriesRef,
  ]);
}
