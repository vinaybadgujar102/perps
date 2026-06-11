import { RESPONSE_KINDS, type TradeEngineResponse } from "@repo/sharedtypes";
import {
  InsufficientMarginError,
  OrderbookNotFoundError,
  OrderNotCancellableError,
  OrderNotFoundError,
  UnauthorizedOrderError,
  UserNotFoundError,
} from "../errors";
import { errorResponse } from "./handlerResponse.util";

export function mapErrorToResponse(
  error: unknown,
  responseKind: RESPONSE_KINDS,
  requestId: string,
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
  if (error instanceof OrderNotFoundError) {
    return errorResponse(requestId, responseKind, error.message);
  }
  if (error instanceof UnauthorizedOrderError) {
    return errorResponse(requestId, responseKind, error.message);
  }
  if (error instanceof OrderNotCancellableError) {
    return errorResponse(requestId, responseKind, error.message);
  }
  throw error;
}
