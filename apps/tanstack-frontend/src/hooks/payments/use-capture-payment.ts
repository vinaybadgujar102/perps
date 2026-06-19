import { capturePayment } from "#/api/onramp.api";
import { useMutation } from "@tanstack/react-query";

export const useCapturePaymentMutation = () => {
  const { mutateAsync, isSuccess, isError, isPending } = useMutation({
    mutationFn: capturePayment,
    onSuccess: () => {},
    onError: () => {},
  });

  return { mutateAsync, isSuccess, isError, isPending };
};
