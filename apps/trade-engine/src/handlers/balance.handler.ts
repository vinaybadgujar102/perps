import {
  RESPONSE_KINDS,
  type creditBalancePayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERS } from "../utils/user.util";

export const handleCreditBalanceEvent = (
  data: z.infer<typeof creditBalancePayloadSchema>,
): TradeEngineResponse => {
  const { userId, amountUsd, onrampId } = data.payload;
  const result = USERS.creditBalance(userId, amountUsd);

  if (!result.success) {
    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE,
      data: {
        success: false,
        message: result.message,
        data: null,
      },
    };
  }

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE,
    data: {
      success: true,
      message: null,
      data: {
        balanceUsd: result.balanceUsd,
        lockedMarginUsd: result.lockedMarginUsd,
        availableMarginUsd: result.availableMarginUsd,
        creditedAmountUsd: result.creditedAmountUsd,
        onrampId,
      },
    },
  };
};
