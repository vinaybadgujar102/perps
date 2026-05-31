import { fetchOrderbook } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export const useOrderbook = (symbol: string) =>
  useQuery({
    queryKey: queryKeys.orderbook(symbol),
    queryFn: () => fetchOrderbook(symbol),
  });

export { fetchOrderbook };
