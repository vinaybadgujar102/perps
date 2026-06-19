import type {
  ApiEnvelope,
  OnrampDepositResult,
  RazorPayPaymentsObject,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createOnrampDepositApi(amountUsd: number) {
  const result = await apiClient.post<ApiEnvelope<OnrampDepositResult>>(
    "/onramp",
    { amountUsd },
    { headers: authHeaders() },
  );

  if (!result.data.success || !result.data.data) {
    throw new Error(result.data.message || "Deposit failed");
  }

  return result.data.data;
}

export const createPaymentOrder = async (amountUsd: number) => {
  const result = await apiClient.post<ApiEnvelope<RazorPayPaymentsObject>>(
    "/onramp/createPaymentOrder",
    { amountUsd },
    { headers: authHeaders() },
  );

  return result.data.data;
};

export const capturePayment = async ({
  orderId,
  status,
  paymentId,
  signature,
}: {
  orderId: string;
  status: string;
  signature?: string;
  paymentId: string;
}) => {
  const response = await apiClient.post<ApiEnvelope<OnrampDepositResult>>(
    "/onramp/capturePayment",
    { orderId, paymentId, status, signature },
    { headers: authHeaders() },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Payment capture failed");
  }

  return response.data.data;
};
