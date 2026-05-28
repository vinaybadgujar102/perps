import { beforeEach, describe, expect, test } from "bun:test";
import { POSITIONS } from "../inMemoryStates";
import { calculateLiquidationPrice } from "../utils/liquidation.util";
import { createPosition, generatePositionKey } from "../utils/position.util";

function getPosition(userId: number, market = "BTC") {
  return POSITIONS.get(generatePositionKey(userId.toString(), market));
}

function expectEstimatedLiquidationPrice(
  position: { estimatedLiquidationPrice: number } | undefined,
  side: "LONG" | "SHORT",
  qty: number,
  averageEntryPrice: number,
  collateral: number,
) {
  expect(position?.estimatedLiquidationPrice).toBeCloseTo(
    calculateLiquidationPrice(side, {
      qty,
      averageEntryPrice,
      collateral,
    }),
    10,
  );
}

describe("createPosition", () => {
  beforeEach(() => {
    POSITIONS.clear();
  });

  test("creates a new LONG position when none exists", () => {
    createPosition({
      userId: 1,
      orderId: "order-1",
      market: "BTC",
      side: "LONG",
      filledQty: 2,
      fillPrice: 50_000,
    });

    const position = getPosition(1);
    expect(position).toBeDefined();
    expect(position?.size).toBe(2);
    expect(position?.averageEntryPrice).toBe(50_000);
    expect(position?.collateralUser).toBe(5_000);
    expect(position?.orderId).toBe("order-1");
    expectEstimatedLiquidationPrice(position, "LONG", 2, 50_000, 5_000);
  });

  test("creates a new SHORT position when none exists", () => {
    createPosition({
      userId: 10,
      orderId: "order-short",
      market: "BTC",
      side: "SHORT",
      filledQty: 2,
      fillPrice: 50_000,
    });

    const position = getPosition(10);
    expect(position?.size).toBe(-2);
    expect(position?.collateralUser).toBe(5_000);
    expectEstimatedLiquidationPrice(position, "SHORT", 2, 50_000, 5_000);
  });

  test("increases same-direction position with weighted average entry", () => {
    createPosition({
      userId: 2,
      orderId: "order-a",
      market: "BTC",
      side: "LONG",
      filledQty: 2,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 2,
      orderId: "order-b",
      market: "BTC",
      side: "LONG",
      filledQty: 1,
      fillPrice: 51_000,
    });

    const position = getPosition(2);
    const weightedEntry = (2 * 50_000 + 1 * 51_000) / 3;

    expect(position?.size).toBe(3);
    expect(position?.averageEntryPrice).toBe(weightedEntry);
    expect(position?.collateralUser).toBe(7_550);
    expect(position?.orderId).toBe("order-a");
    expectEstimatedLiquidationPrice(
      position,
      "LONG",
      3,
      weightedEntry,
      7_550,
    );
  });

  test("reduces LONG on opposite-side partial close using position side, not fill side", () => {
    createPosition({
      userId: 3,
      orderId: "order-long",
      market: "BTC",
      side: "LONG",
      filledQty: 4,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 3,
      orderId: "order-short-close",
      market: "BTC",
      side: "SHORT",
      filledQty: 1.5,
      fillPrice: 52_000,
    });

    const position = getPosition(3);

    expect(position?.size).toBe(2.5);
    expect(position?.averageEntryPrice).toBe(50_000);
    expect(position?.collateralUser).toBe(6_250);

    expectEstimatedLiquidationPrice(position, "LONG", 2.5, 50_000, 6_250);

    const wrongSideFromFillOrderType = calculateLiquidationPrice("SHORT", {
      qty: 2.5,
      averageEntryPrice: 50_000,
      collateral: 6_250,
    });
    expect(position?.estimatedLiquidationPrice).not.toBeCloseTo(
      wrongSideFromFillOrderType,
      10,
    );
  });

  test("reduces SHORT on opposite-side partial close using position side, not fill side", () => {
    createPosition({
      userId: 6,
      orderId: "open-short",
      market: "BTC",
      side: "SHORT",
      filledQty: 4,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 6,
      orderId: "close-partial-long",
      market: "BTC",
      side: "LONG",
      filledQty: 1.5,
      fillPrice: 48_000,
    });

    const position = getPosition(6);

    expect(position?.size).toBe(-2.5);
    expect(position?.averageEntryPrice).toBe(50_000);
    expect(position?.collateralUser).toBe(6_250);

    expectEstimatedLiquidationPrice(position, "SHORT", 2.5, 50_000, 6_250);

    const wrongSideFromFillOrderType = calculateLiquidationPrice("LONG", {
      qty: 2.5,
      averageEntryPrice: 50_000,
      collateral: 6_250,
    });
    expect(position?.estimatedLiquidationPrice).not.toBeCloseTo(
      wrongSideFromFillOrderType,
      10,
    );
  });

  test("deletes position when opposite fill fully closes size", () => {
    createPosition({
      userId: 4,
      orderId: "open-short",
      market: "BTC",
      side: "SHORT",
      filledQty: 3,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 4,
      orderId: "close-short",
      market: "BTC",
      side: "LONG",
      filledQty: 3,
      fillPrice: 49_000,
    });

    expect(getPosition(4)).toBeUndefined();
  });

  test("flips position direction and resets entry to flip price", () => {
    createPosition({
      userId: 5,
      orderId: "open-long",
      market: "BTC",
      side: "LONG",
      filledQty: 2,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 5,
      orderId: "flip-to-short",
      market: "BTC",
      side: "SHORT",
      filledQty: 3,
      fillPrice: 51_000,
    });

    const position = getPosition(5);

    expect(position?.size).toBe(-1);
    expect(position?.averageEntryPrice).toBe(51_000);
    expect(position?.collateralUser).toBe(2_550);
    expect(position?.orderId).toBe("open-long");
    expectEstimatedLiquidationPrice(position, "SHORT", 1, 51_000, 2_550);
  });
});
