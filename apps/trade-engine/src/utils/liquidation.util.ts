type LiquidationInput = {
  qty: number;
  averageEntryPrice: number;
  collateral: number;
  // maintenance margin rate as a decimal (e.g. 0.005 for 0.5%).
  mmr: number;
};

/**
 * Long liquidation price:
 * LiqPrice = (EntryPrice * Qty - InitialMargin) / (Qty * (1 - MMR))
 */
export function calculateLongLiquidationPrice(input: LiquidationInput): number {
  const { qty, averageEntryPrice, collateral, mmr } = input;

  return (averageEntryPrice * qty - collateral) / (qty * (1 - mmr));
}

/**
 * Short liquidation price:
 * LiqPrice = (EntryPrice * Qty + InitialMargin) / (Qty * (1 + MMR))
 */
export function calculateShortLiquidationPrice(
  input: LiquidationInput,
): number {
  const { qty, averageEntryPrice, collateral, mmr } = input;

  return (averageEntryPrice * qty + collateral) / (qty * (1 + mmr));
}
