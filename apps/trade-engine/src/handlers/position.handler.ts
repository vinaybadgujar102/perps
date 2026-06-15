import {
  RESPONSE_KINDS,
  SIDE,
  type getOpenPositionsPayloadSchema,
  type TradeEngineResponse,
} from "@repo/sharedtypes";
import type z from "zod";
import { POSITIONS } from "../appState";

export const handleGetOpenPositionsEvent = (
  data: z.infer<typeof getOpenPositionsPayloadSchema>,
): TradeEngineResponse => {
  const openPositions = Array.from(POSITIONS.values())
    .filter((position) => position.userId === data.payload.userId)
    .map((position) => ({
      market: position.market,
      side: position.size > 0 ? SIDE.LONG : SIDE.SHORT,
      size: position.size,
      averageEntryPrice: position.averageEntryPrice,
      collateralUser: position.collateralUser,
      estimatedLiquidationPrice: position.estimatedLiquidationPrice,
      realizedPnl: position.realizedPnl,
    }));

  return {
    requestId: data.requestId,
    kind: RESPONSE_KINDS.GET_OPEN_POSITIONS_RESPONSE,
    data: {
      success: true,
      message: null,
      data: openPositions,
    },
  };
};
