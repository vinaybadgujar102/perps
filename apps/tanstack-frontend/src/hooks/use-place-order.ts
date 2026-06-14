import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrderApi } from "#/api/order.api";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { formatOrderSuccessMessage } from "#/lib/trading/order-messages";
import { queryKeys } from "#/lib/query-keys";

export function usePlaceOrder(onQtyCleared?: () => void) {
  const queryClient = useQueryClient();
  const { refreshBalance } = useUser();

  return useMutation({
    mutationFn: createOrderApi,
    onSuccess: (result) => {
      terminalToast.success(
        "SUCCESS",
        formatOrderSuccessMessage(result.message, result.fills.length),
      );
      refreshBalance();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderbook() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions() });
      onQtyCleared?.();
    },
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    },
  });
}
