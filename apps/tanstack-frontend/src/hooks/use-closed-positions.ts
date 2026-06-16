import { useQuery } from "@tanstack/react-query";
import { getClosedPositionsApi } from "#/api/position.api";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useClosedPositions() {
  const { isAuthenticated } = useUser();

  return useQuery({
    queryKey: queryKeys.closedPositions(),
    queryFn: getClosedPositionsApi,
    enabled: isAuthenticated,
  });
}
