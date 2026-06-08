import { RESPONSE_KINDS, type TradeEngineResponse } from "@repo/sharedtypes";
import {
  InsufficientMarginError,
  OrderbookNotFoundError,
  UserNotFoundError,
} from "../errors";
import { errorResponse } from "./handlerResponse.util";

export function mapErrorToResponse(
  error: unknown,
  requestId: string,
  responseKind: RESPONSE_KINDS,
): TradeEngineResponse {
  if (error instanceof UserNotFoundError) {
    return errorResponse(requestId, responseKind, error.message);
  }
  if (error instanceof InsufficientMarginError) {
    return errorResponse(requestId, responseKind, error.message);
  }
  if (error instanceof OrderbookNotFoundError) {
    return errorResponse(requestId, responseKind, error.message);
  }
  throw error;
}
