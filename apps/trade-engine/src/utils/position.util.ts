import type { Position } from "@repo/sharedtypes";
import type { Order } from "../types";

export const positionFactory = (
  order: Order,
  requiredCollateral: number,
  averageEntryPrice: number,
): Position => {
  return {
    id: crypto.randomUUID(),
    orderId: order.id,
    market: order.market,
    collateralUser: requiredCollateral,
    userId: order.userId,
    size: order.filledQty * (order.type === "LONG" ? 1 : -1),
    averageEntryPrice,
    estimatedLiquidationPrice: 0,
    createdAt: new Date(),
  };
};
