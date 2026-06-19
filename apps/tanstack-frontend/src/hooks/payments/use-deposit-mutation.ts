import { createPaymentOrder } from "#/api/onramp.api";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useMutation } from "@tanstack/react-query";

export const useDepositMutation = () => {
  const { data, mutateAsync, isSuccess, isPending, error, reset } = useMutation({
    mutationFn: createPaymentOrder,
    onSuccess: () => {},
    onError: (error) => {
      terminalToast.error(
        "ERROR",
        error instanceof Error ? error.message : "Deposit failed",
      );
    },
  });

  return {
    data,
    mutateAsync,
    isSuccess,
    isPending,
    error,
    reset,
  };
};
