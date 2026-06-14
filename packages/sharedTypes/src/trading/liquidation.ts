import { SIDE, type Side } from "../enums";

export const MMR = 0.005; // maintenance margin rate as a decimal (e.g. 0.005 for 0.5%).

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
