import {
  RESPONSE_KINDS,
  type getAccountStatePayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERMANAGER } from "../appState";

export const handleGetAccountStateEvent = (
  data: z.infer<typeof getAccountStatePayloadSchema>,
): TradeEngineResponse => {
  if (!USERMANAGER.hasUser(data.payload.userId)) {
    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE,
      data: {
        success: false,
        message: "USER_NOT_FOUND",
        data: null,
      },
    };
  }

  const user = USERMANAGER.getUser(data.payload.userId);
  const responseData = {
    success: true,
    message: null,
    data: {
      balanceUsd: user.balance,
      lockedMarginUsd: user.lockedBalance,
      availableMarginUsd: user.balance - user.lockedBalance,
    },
  };

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE,
    data: responseData,
  };
};
