import {
  RESPONSE_KINDS,
  type createUserPayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERS } from "../utils/user.util";

export const handleCreateUserEvent = (
  data: z.infer<typeof createUserPayloadSchema>,
): TradeEngineResponse => {
  const { userId } = data.payload;

  if (USERS.getUser(userId)) {
    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.CREATE_USER_RESPONSE,
      data: {
        success: false,
        message: "USER_ALREADY_EXISTS",
        data: null,
      },
    };
  }

  USERS.addUser(userId);

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.CREATE_USER_RESPONSE,
    data: {
      success: true,
      message: null,
      data: { userId },
    },
  };
};
