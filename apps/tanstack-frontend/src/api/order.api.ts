import type {
  ApiEnvelope,
  CancelOrderData,
  CancelOrderPayload,
  CreateOrderData,
  CreateOrderInput,
  Fill,
  OpenOrder,
  OrderHistoryListData,
  PersistedOrder,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type CreateOrderResult = {
  message: string;
  fills: Fill[];
};

export type CancelOrderResult = {
  message: string;
};

export type { OpenOrder, PersistedOrder };

function unwrapListResponse<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.message || "Request failed");
  }
  return envelope.data;
}

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
    fills: engine.data ?? [],
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

export async function getOpenOrdersApi(): Promise<OpenOrder[]> {
  const result = await apiClient.get<
    ApiEnvelope<{
      success: boolean;
      message: string | null;
      data: OpenOrder[] | null;
    }>
  >("/order", { headers: authHeaders() });

  const engine = unwrapEngineResponse<OpenOrder[]>(result.data);
  return engine.data ?? [];
}

export async function getOrderHistoryApi(): Promise<PersistedOrder[]> {
  const result = await apiClient.get<ApiEnvelope<OrderHistoryListData>>(
    "/order/history",
    { headers: authHeaders() },
  );

  const data = unwrapListResponse(result.data);
  return data.orders;
}
