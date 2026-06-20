import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closePositionApi } from "#/api/position.api";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useClosePosition() {
  const queryClient = useQueryClient();
  const { refreshBalance } = useUser();

  return useMutation({
    mutationFn: closePositionApi,
    onSuccess: (result, market) => {
      terminalToast.success("SUCCESS", result.message);
      refreshBalance();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderbook(market) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderHistory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.closedPositions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.fills() });
    },
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    },
  });
}
