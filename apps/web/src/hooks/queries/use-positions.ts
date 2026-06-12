import { fetchOpenPositions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export const usePositions = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.positions,
    queryFn: fetchOpenPositions,
    enabled,
  });

export { fetchOpenPositions };
