import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelOrderApi, type OpenOrder } from "#/api/order.api";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { refreshBalance } = useUser();

  return useMutation({
    mutationFn: cancelOrderApi,
    onSuccess: (result, orderId) => {
      terminalToast.success("SUCCESS", result.message);
      refreshBalance();
      const orders = queryClient.getQueryData<OpenOrder[]>(queryKeys.openOrders());
      const market = orders?.find((order) => order.id === orderId)?.market;
      if (market) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orderbook(market) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.openOrders() });
    },
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    },
  });
}
