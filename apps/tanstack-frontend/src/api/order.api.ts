import type {
  ApiEnvelope,
  CancelOrderData,
  CancelOrderPayload,
  CreateOrderData,
  CreateOrderInput,
  Fill,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type CreateOrderResult = {
  message: string;
};

export type CancelOrderResult = {
  message: string;
};

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createOrderApi(
  payload: CreateOrderInput,
): Promise<CreateOrderResult> {
  const result = await apiClient.post<ApiEnvelope<CreateOrderData>>(
    "/order",
    payload,
    { headers: authHeaders() },
  );

  const engine = unwrapEngineResponse<Fill[]>(result.data);

  return {
    message: engine.message ?? "Order placed",
  };
}

export async function cancelOrderApi(
  orderId: string,
): Promise<CancelOrderResult> {
  const result = await apiClient.delete<ApiEnvelope<CancelOrderData>>(
    `/order/${orderId}`,
    { headers: authHeaders() },
  );

  const engine = unwrapEngineResponse<CancelOrderPayload>(result.data);

  return {
    message: engine.message ?? "Order cancelled",
  };
}
