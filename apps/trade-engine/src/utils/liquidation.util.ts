import type { Side } from "@repo/sharedtypes";
import { ORDER_TYPE, SIDE } from "@repo/sharedtypes";
import { MMR } from "../constants";
import { POSITIONS } from "../inMemoryStates";
// import { createOrder } from "./order.util";
import type { Order } from "../types";

export type LiquidationInput = {
  qty: number;
  averageEntryPrice: number;
  collateral: number;
};

/**
 * Long liquidation price:
 * LiqPrice = (EntryPrice * Qty - InitialMargin) / (Qty * (1 - MMR))
 */
export function calculateLongLiquidationPrice(input: LiquidationInput): number {
  const { qty, averageEntryPrice, collateral } = input;

  return (averageEntryPrice * qty - collateral) / (qty * (1 - MMR));
}

/**
 * Short liquidation price:
 * LiqPrice = (EntryPrice * Qty + InitialMargin) / (Qty * (1 + MMR))
 */
export function calculateShortLiquidationPrice(
  input: LiquidationInput,
): number {
  const { qty, averageEntryPrice, collateral } = input;

  return (averageEntryPrice * qty + collateral) / (qty * (1 + MMR));
}

export function calculateLiquidationPrice(
  side: Side,
  input: LiquidationInput,
): number {
  return side === SIDE.LONG
    ? calculateLongLiquidationPrice(input)
    : calculateShortLiquidationPrice(input);
}

export const liquidatePositions = (indexPrice: number) => {
  for (const position of POSITIONS.values()) {
    if (position.size === 0) continue;

    const isLong = position.size > 0;
    const shouldLiquidate = isLong
      ? indexPrice <= position.estimatedLiquidationPrice
      : indexPrice >= position.estimatedLiquidationPrice;

    if (!shouldLiquidate) continue;

    const liquidationOrder: Order = {
      id: crypto.randomUUID(),
      price: indexPrice,
      market: position.market,
      qty: Math.abs(position.size),
      filledQty: 0,
      userId: position.userId,
      orderType: ORDER_TYPE.MARKET_ORDER,
      timestamp: Date.now(),
      side: isLong ? SIDE.SHORT : SIDE.LONG,
    };

    // createOrder(liquidationOrder);
    void liquidationOrder;
  }
};
