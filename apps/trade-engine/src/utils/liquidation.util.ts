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
  orderType: "LONG" | "SHORT",
  input: LiquidationInput,
): number {
  return orderType === "LONG"
    ? calculateLongLiquidationPrice(input)
    : calculateShortLiquidationPrice(input);
}
