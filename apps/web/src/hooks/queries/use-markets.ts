import { fetchMarkets } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export const useMarkets = () =>
  useQuery({
    queryKey: queryKeys.markets,
    queryFn: fetchMarkets,
  });

export { fetchMarkets };
