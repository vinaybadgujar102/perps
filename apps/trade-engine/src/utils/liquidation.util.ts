import type { Side } from "@repo/sharedtypes";
import { SIDE } from "@repo/sharedtypes";
import { MMR } from "../constants";

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
