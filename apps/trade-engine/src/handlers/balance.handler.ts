import {
  RESPONSE_KINDS,
  type creditBalancePayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { USERMANAGER } from "../appState";

export const handleCreditBalanceEvent = (
  data: z.infer<typeof creditBalancePayloadSchema>,
): TradeEngineResponse => {
  const { userId, amountUsd, onrampId } = data.payload;

  // can we encapsulate this into a resusable function?
  if (!USERMANAGER.hasUser(userId)) {
    return {
      requestId: data.requestId,
      kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE,
      data: {
        success: false,
        message: "USER_NOT_FOUND",
        data: null,
      },
    };
  }

  const user = USERMANAGER.getUser(userId);
  const result = user.depositBalance(amountUsd);

  const balanceSnapshot = user.getBalanceSnapshot();

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE,
    data: {
      success: true,
      message: null,
      data: {
        balanceUsd: balanceSnapshot.balance,
        lockedMarginUsd: balanceSnapshot.lockedBalance,
        availableMarginUsd:
          balanceSnapshot.balance - balanceSnapshot.lockedBalance,
        creditedAmountUsd: result,
        onrampId,
      },
    },
  };
};
