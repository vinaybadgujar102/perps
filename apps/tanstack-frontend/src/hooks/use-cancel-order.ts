import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelOrderApi } from "#/api/order.api";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { refreshBalance } = useUser();

  return useMutation({
    mutationFn: cancelOrderApi,
    onSuccess: (result) => {
      terminalToast.success("SUCCESS", result.message);
      refreshBalance();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderbook() });
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
