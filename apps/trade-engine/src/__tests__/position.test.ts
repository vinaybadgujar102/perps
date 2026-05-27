import { beforeEach, describe, expect, test } from "bun:test";
import { POSITIONS } from "../inMemoryStates";
import { createPosition, generatePositionKey } from "../utils/position.util";

function getPosition(userId: number, market = "BTC") {
  return POSITIONS.get(generatePositionKey(userId.toString(), market));
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
      orderType: "LONG",
      filledQty: 2,
      fillPrice: 50_000,
    });

    const position = getPosition(1);
    expect(position).toBeDefined();
    expect(position?.size).toBe(2);
    expect(position?.averageEntryPrice).toBe(50_000);
    expect(position?.collateralUser).toBe(5_000);
    expect(position?.orderId).toBe("order-1");
  });

  test("increases same-direction position with weighted average entry", () => {
    createPosition({
      userId: 2,
      orderId: "order-a",
      market: "BTC",
      orderType: "LONG",
      filledQty: 2,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 2,
      orderId: "order-b",
      market: "BTC",
      orderType: "LONG",
      filledQty: 1,
      fillPrice: 51_000,
    });

    const position = getPosition(2);
    expect(position?.size).toBe(3);
    expect(position?.averageEntryPrice).toBe((2 * 50_000 + 1 * 51_000) / 3);
    expect(position?.collateralUser).toBe(7_550);
    // Existing logic preserves original order id on updates.
    expect(position?.orderId).toBe("order-a");
  });

  test("reduces position on opposite-side partial close", () => {
    createPosition({
      userId: 3,
      orderId: "order-long",
      market: "BTC",
      orderType: "LONG",
      filledQty: 4,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 3,
      orderId: "order-short-close",
      market: "BTC",
      orderType: "SHORT",
      filledQty: 1.5,
      fillPrice: 52_000,
    });

    const position = getPosition(3);
    expect(position?.size).toBe(2.5);
    expect(position?.averageEntryPrice).toBe(50_000);
    expect(position?.collateralUser).toBe(6_250);
  });

  test("deletes position when opposite fill fully closes size", () => {
    createPosition({
      userId: 4,
      orderId: "open-short",
      market: "BTC",
      orderType: "SHORT",
      filledQty: 3,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 4,
      orderId: "close-short",
      market: "BTC",
      orderType: "LONG",
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
      orderType: "LONG",
      filledQty: 2,
      fillPrice: 50_000,
    });
    createPosition({
      userId: 5,
      orderId: "flip-to-short",
      market: "BTC",
      orderType: "SHORT",
      filledQty: 3,
      fillPrice: 51_000,
    });

    const position = getPosition(5);
    expect(position?.size).toBe(-1);
    expect(position?.averageEntryPrice).toBe(51_000);
    expect(position?.collateralUser).toBe(2_550);
    // Existing logic preserves original order id on updates.
    expect(position?.orderId).toBe("open-long");
  });
});
