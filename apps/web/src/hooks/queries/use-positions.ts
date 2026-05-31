import { fetchOpenPositions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export const usePositions = (userId: number | undefined, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.positions(userId ?? 0),
    queryFn: () => fetchOpenPositions(userId!),
    enabled: enabled && Boolean(userId),
  });

export { fetchOpenPositions };
