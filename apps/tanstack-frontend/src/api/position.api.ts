import type { ApiEnvelope, openPositionSchema } from "@repo/sharedtypes";
import type { z } from "zod";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type OpenPosition = z.infer<typeof openPositionSchema>;

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
