import type { ApiEnvelope, CandleInterval, CandlesResponse } from "@repo/sharedtypes";
import { apiClient } from "./axiosClient";

export async function getCandlesApi(
  market: string,
  interval: CandleInterval,
  limit = 500,
): Promise<CandlesResponse> {
  const result = await apiClient.get<ApiEnvelope<CandlesResponse>>(
    `/market/${market}/candles`,
    { params: { interval, limit } },
  );

  if (!result.data.success || !result.data.data) {
    throw new Error(result.data.message ?? "Candles unavailable");
  }

  return result.data.data;
}
