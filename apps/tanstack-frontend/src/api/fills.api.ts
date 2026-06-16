import type { ApiEnvelope, Fill, FillsListData } from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

function unwrapListResponse<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.message || "Request failed");
  }
  return envelope.data;
}

export async function getFillsApi(): Promise<Fill[]> {
  const result = await apiClient.get<ApiEnvelope<FillsListData>>("/fills", {
    headers: authHeaders(),
  });

  const data = unwrapListResponse(result.data);
  return data.fills;
}
