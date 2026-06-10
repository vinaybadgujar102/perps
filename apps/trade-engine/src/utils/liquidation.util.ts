import { SIDE, type Side } from "@repo/sharedtypes";
import { MMR } from "../constants";
import { POSITIONS } from "../inMemoryStates";
import type { OrderService } from "../services/order.service";

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

export const liquidatePositions = (
  market: string,
  indexPrice: number,
  orderService: OrderService,
) => {
  const positionsToLiquidate = [...POSITIONS.values()].filter((position) => {
    if (position.size === 0 || position.market !== market) return false;

    const isLong = position.size > 0;
    return isLong
      ? indexPrice <= position.estimatedLiquidationPrice
      : indexPrice >= position.estimatedLiquidationPrice;
  });

  for (const position of positionsToLiquidate) {
    orderService.liquidatePosition(position, indexPrice);
  }
};
