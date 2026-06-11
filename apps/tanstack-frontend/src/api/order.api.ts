import type {
  ApiEnvelope,
  CreateOrderData,
  CreateOrderInput,
  Fill,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type CreateOrderResult = {
  message: string;
};

export async function createOrderApi(
  payload: CreateOrderInput,
): Promise<CreateOrderResult> {
  const token = localStorage.getItem("auth-token");

  const result = await apiClient.post<ApiEnvelope<CreateOrderData>>(
    "/order",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const engine = unwrapEngineResponse<Fill[]>(result.data);

  return {
    message: engine.message ?? "Order placed",
  };
}
