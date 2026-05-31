import { fetchMarket } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export const useMarket = (symbol: string) =>
  useQuery({
    queryKey: queryKeys.market(symbol),
    queryFn: () => fetchMarket(symbol),
  });

export { fetchMarket };
