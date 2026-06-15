import type { ApiEnvelope, CreateOrderData, Fill, openPositionSchema } from "@repo/sharedtypes";
import type { z } from "zod";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type OpenPosition = z.infer<typeof openPositionSchema>;

export type ClosePositionResult = {
  message: string;
  fills: Fill[];
};

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getOpenPositionsApi(): Promise<OpenPosition[]> {
  const result = await apiClient.get<
    ApiEnvelope<{
      success: boolean;
      message: string | null;
      data: OpenPosition[] | null;
    }>
  >("/positions", { headers: authHeaders() });

  const engine = unwrapEngineResponse<OpenPosition[]>(result.data);
  return engine.data ?? [];
}

export async function closePositionApi(
  market: string,
): Promise<ClosePositionResult> {
  const result = await apiClient.post<ApiEnvelope<CreateOrderData>>(
    `/positions/${market}/close`,
    {},
    { headers: authHeaders() },
  );

  const engine = unwrapEngineResponse<Fill[]>(result.data);

  return {
    message: engine.message ?? "Position closed successfully.",
    fills: engine.data ?? [],
  };
}
