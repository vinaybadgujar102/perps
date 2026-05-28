import {
  RESPONSE_KINDS,
  type getAccountStatePayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERS } from "../utils/user.util";

export const handleGetAccountStateEvent = (
  data: z.infer<typeof getAccountStatePayloadSchema>,
): TradeEngineResponse => {
  const user = USERS.getUser(data.payload.userId);

  const responseData = user
    ? {
        success: true,
        message: null,
        data: {
          balanceUsd: user.balance,
          lockedMarginUsd: user.lockedBalance,
          availableMarginUsd: user.balance - user.lockedBalance,
        },
      }
    : {
        success: false,
        message: "USER_NOT_FOUND",
        data: null,
      };

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE,
    data: responseData,
  };
};
