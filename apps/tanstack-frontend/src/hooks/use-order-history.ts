import { useQuery } from "@tanstack/react-query";
import { getOrderHistoryApi } from "#/api/order.api";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useOrderHistory() {
  const { isAuthenticated } = useUser();

  return useQuery({
    queryKey: queryKeys.orderHistory(),
    queryFn: getOrderHistoryApi,
    enabled: isAuthenticated,
  });
}
