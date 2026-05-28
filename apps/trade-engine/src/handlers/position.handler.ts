import {
  QUEUES,
  RESPONSE_KINDS,
  SIDE,
  type getOpenPositionsPayloadSchema,
} from "@repo/sharedtypes";
import type z from "zod";
import { POSITIONS } from "../inMemoryStates";
import { publisherRedis } from ".";

export const handleGetOpenPositionsEvent = async (
  data: z.infer<typeof getOpenPositionsPayloadSchema>,
) => {
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

  await publisherRedis.xAdd(QUEUES.RESPONSE_QUEUE, "*", {
    data: JSON.stringify({
      requestId: data.requestId,
      kind: RESPONSE_KINDS.GET_OPEN_POSITIONS_RESPONSE,
      data: {
        success: true,
        message: null,
        data: openPositions,
      },
    }),
  });
};
