import type { ApiEnvelope, OnrampDepositResult } from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";
import { getAuthToken } from "#/lib/auth";

function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createOnrampDepositApi(
  amountUsd: number,
): Promise<OnrampDepositResult> {
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
