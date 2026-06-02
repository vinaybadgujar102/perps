import {
  RESPONSE_KINDS,
  type createUserPayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type { EventHandler } from "../dispatcher/eventdispatcher";
import type z from "zod";
import { USERMANAGER } from "../inMemoryStates";

export class CreateUserHandler implements EventHandler {
  handle(event: z.infer<typeof createUserPayloadSchema>): TradeEngineResponse {
    const { userId } = event.payload;

    if (USERMANAGER.getUser(userId)) {
      return {
        requestId: event.requestId,
        kind: RESPONSE_KINDS.CREATE_USER_RESPONSE,
        data: {
          success: false,
          message: "USER_ALREADY_EXISTS",
          data: null,
        },
      };
    }

    USERMANAGER.createUser(userId);

    return {
      requestId: event.requestId,
      kind: RESPONSE_KINDS.CREATE_USER_RESPONSE,
      data: {
        success: true,
        message: null,
        data: { userId },
      },
    };
  }
}
