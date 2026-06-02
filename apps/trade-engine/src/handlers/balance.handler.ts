import {
  RESPONSE_KINDS,
  type creditBalancePayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERMANAGER } from "../inMemoryStates";

export const handleCreditBalanceEvent = (
  data: z.infer<typeof creditBalancePayloadSchema>,
): TradeEngineResponse => {
  const { userId, amountUsd, onrampId } = data.payload;
  const user = USERMANAGER.getUser(userId);
  const result = user?.depositBalance(amountUsd);

  if (!result || !user) {
    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE,
      data: {
        success: false,
        message: "Failed to credit balance",
        data: null,
      },
    };
  }

  const balanceSnapshot = user.getBalanceSnapshot();

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE,
    data: {
      success: true,
      message: null,
      data: {
        balanceUsd: balanceSnapshot.balance,
        lockedMarginUsd: balanceSnapshot.lockedBalanece,
        availableMarginUsd:
          balanceSnapshot.balance - balanceSnapshot.lockedBalanece,
        creditedAmountUsd: result,
        onrampId,
      },
    },
  };
};
