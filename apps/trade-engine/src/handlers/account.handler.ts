import {
  QUEUES,
  RESPONSE_KINDS,
  type getAccountStatePayloadSchema,
} from "@repo/sharedtypes";
import type z from "zod";
import { publisherRedis } from ".";
import { USERS } from "../utils/user.util";

export const handleGetAccountStateEvent = async (
  data: z.infer<typeof getAccountStatePayloadSchema>,
) => {
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

  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify({
      requestId: data.requestId,
      kind: RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE,
      data: responseData,
    }),
  });
};
