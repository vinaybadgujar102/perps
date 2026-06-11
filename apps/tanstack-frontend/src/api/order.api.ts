import type {
  ApiEnvelope,
  CreateOrderData,
  CreateOrderInput,
} from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";

export async function createOrderApi(
  payload: CreateOrderInput,
): Promise<ApiEnvelope<CreateOrderData>> {
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
  return result.data;
}
