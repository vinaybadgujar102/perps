import { describe, expect, test } from "bun:test";
import { MMR } from "../constants";
import {
  calculateLiquidationPrice,
  calculateLongLiquidationPrice,
  calculateShortLiquidationPrice,
  type LiquidationInput,
} from "../utils/liquidation.util";

const sampleInput: LiquidationInput = {
  qty: 2,
  averageEntryPrice: 50_000,
  collateral: 5_000,
};

describe("liquidation formulas", () => {
  test("calculates long liquidation price using shared MMR", () => {
    const { qty, averageEntryPrice, collateral } = sampleInput;

    const liqPrice = calculateLongLiquidationPrice(sampleInput);

    const expected =
      (averageEntryPrice * qty - collateral) / (qty * (1 - MMR));

    expect(liqPrice).toBeCloseTo(expected, 10);
    expect(liqPrice).toBeCloseTo(47_738.69346733668, 10);
  });

  test("calculates short liquidation price using shared MMR", () => {
    const { qty, averageEntryPrice, collateral } = sampleInput;

    const liqPrice = calculateShortLiquidationPrice(sampleInput);

    const expected =
      (averageEntryPrice * qty + collateral) / (qty * (1 + MMR));

    expect(liqPrice).toBeCloseTo(expected, 10);
    expect(liqPrice).toBeCloseTo(52_238.80597014925, 10);
  });

  test("calculateLiquidationPrice delegates to long formula", () => {
    expect(calculateLiquidationPrice("LONG", sampleInput)).toBe(
      calculateLongLiquidationPrice(sampleInput),
    );
  });

  test("calculateLiquidationPrice delegates to short formula", () => {
    expect(calculateLiquidationPrice("SHORT", sampleInput)).toBe(
      calculateShortLiquidationPrice(sampleInput),
    );
  });
});
