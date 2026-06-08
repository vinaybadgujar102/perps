import {
  RESPONSE_KINDS,
  type createUserPayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import type z from "zod";
import { USERMANAGER } from "../inMemoryStates";
import {
  errorResponse,
  successResponse,
} from "../utils/handlerResponse.util";
import { mapErrorToResponse } from "../utils/mapErrorToResponse";

export class CreateUserHandler implements EventHandler {
  handle(event: z.infer<typeof createUserPayloadSchema>): TradeEngineResponse {
    try {
      const { userId } = event.payload;

      if (USERMANAGER.hasUser(userId)) {
        return errorResponse(
          event.requestId,
          RESPONSE_KINDS.CREATE_USER_RESPONSE,
          "USER_ALREADY_EXISTS",
        );
      }

      USERMANAGER.createUser(userId);

      return successResponse(
        event.requestId,
        RESPONSE_KINDS.CREATE_USER_RESPONSE,
        { userId },
      );
    } catch (error) {
      return mapErrorToResponse(
        error,
        event.requestId,
        RESPONSE_KINDS.CREATE_USER_RESPONSE,
      );
    }
  }
}
