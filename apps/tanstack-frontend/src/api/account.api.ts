import type { ApiEnvelope } from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";
import { unwrapEngineResponse } from "./unwrap-engine-response";

export type AccountState = {
  balanceUsd: number;
  lockedMarginUsd: number;
  availableMarginUsd: number;
};

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getAccountApi(userId: number): Promise<AccountState> {
  const result = await apiClient.get<
    ApiEnvelope<{
      success: boolean;
      message: string | null;
      data: AccountState | null;
    }>
  >(`/account/${userId}`, { headers: authHeaders() });

  const engine = unwrapEngineResponse<AccountState>(result.data);
  if (!engine.data) {
    throw new Error(engine.message ?? "Failed to load account");
  }

  return engine.data;
}
