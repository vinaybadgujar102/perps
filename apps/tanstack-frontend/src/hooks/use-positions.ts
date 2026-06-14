import { useQuery } from "@tanstack/react-query";
import { getOpenPositionsApi } from "#/api/position.api";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function usePositions() {
  const { isAuthenticated } = useUser();

  return useQuery({
    queryKey: queryKeys.positions(),
    queryFn: getOpenPositionsApi,
    enabled: isAuthenticated,
  });
}
