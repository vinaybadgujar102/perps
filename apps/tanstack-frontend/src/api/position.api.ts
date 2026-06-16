import type {
  ApiEnvelope,
  ClosedPositionsListData,
  CreateOrderData,
  Fill,
  openPositionSchema,
  PersistedClosedPosition,
} from "@repo/sharedtypes";
import type { z } from "zod";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type OpenPosition = z.infer<typeof openPositionSchema>;

function unwrapListResponse<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.message || "Request failed");
  }
  return envelope.data;
}

export type { PersistedClosedPosition };

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

export async function getClosedPositionsApi(): Promise<PersistedClosedPosition[]> {
  const result = await apiClient.get<ApiEnvelope<ClosedPositionsListData>>(
    "/positions/closed",
    { headers: authHeaders() },
  );

  const data = unwrapListResponse(result.data);
  return data.closedPositions;
}
