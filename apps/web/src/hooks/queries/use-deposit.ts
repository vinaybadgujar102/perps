import { createOnrampDeposit } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeposit = (userId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amountUsd: number) => createOnrampDeposit(amountUsd),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account(userId ?? 0) });
    },
  });
};
