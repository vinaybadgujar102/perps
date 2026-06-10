import { RESPONSE_KINDS, type TradeEngineResponse } from "@repo/sharedtypes";

export function successResponse<T>(
  requestId: string,
  kind: RESPONSE_KINDS,
  data: T,
  message: string | null = null,
): TradeEngineResponse {
  return {
    requestId,
    kind,
    data: { success: true, message, data },
  } as TradeEngineResponse;
}

export function errorResponse(
  requestId: string,
  kind: RESPONSE_KINDS,
  message: string,
): TradeEngineResponse {
  return {
    requestId,
    kind,
    data: { success: false, message, data: null },
  } as TradeEngineResponse;
}
