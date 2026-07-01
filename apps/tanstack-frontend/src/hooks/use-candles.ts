import type { CandleInterval } from "@repo/sharedtypes";
import { useQuery } from "@tanstack/react-query";
import { getCandlesApi } from "#/api/candles.api";
import { queryKeys } from "#/lib/query-keys";

export function useCandles(market: string, interval: CandleInterval) {
  return useQuery({
    queryKey: queryKeys.candles(market, interval),
    queryFn: () => getCandlesApi(market, interval),
    staleTime: 60_000,
  });
}
