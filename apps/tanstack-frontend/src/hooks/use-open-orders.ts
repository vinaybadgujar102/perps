import { useQuery } from "@tanstack/react-query";
import { getOpenOrdersApi } from "#/api/order.api";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useOpenOrders() {
  const { isAuthenticated } = useUser();

  return useQuery({
    queryKey: queryKeys.openOrders(),
    queryFn: getOpenOrdersApi,
    enabled: isAuthenticated,
  });
}
