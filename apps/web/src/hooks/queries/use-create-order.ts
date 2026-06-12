import { createOrder, type CreateOrderInput } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateOrder = (userId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account(userId ?? 0) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions });
    },
  });
};
