import { beforeEach, describe, expect, test } from "bun:test";
import { ORDER_TYPE, SIDE, type Position } from "@repo/sharedtypes";
import { MMR } from "../constants";
import { POSITIONS, orderbooks } from "../inMemoryStates";
import type { Order } from "../types";
import { createOrder } from "../utils/order.util";
import {
  calculateLiquidationPrice,
  calculateLongLiquidationPrice,
  calculateShortLiquidationPrice,
  liquidatePositions,
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

function makeOrder(
  overrides: Partial<Order> & Pick<Order, "side" | "price" | "qty">,
): Order {
  return {
    id: crypto.randomUUID(),
    market: "BTC",
    qty: overrides.qty,
    filledQty: 0,
    price: overrides.price,
    userId: overrides.userId ?? 1,
    side: overrides.side,
    orderType: ORDER_TYPE.LIMIT_ORDER,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makePosition(overrides: Partial<Position> & Pick<Position, "size">): Position {
  return {
    id: crypto.randomUUID(),
    orderId: "position-order",
    market: "BTC",
    collateralUser: 5_000,
    userId: 99,
    size: overrides.size,
    averageEntryPrice: 50_000,
    estimatedLiquidationPrice: 48_000,
    realizedPnl: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("liquidatePositions", () => {
  beforeEach(() => {
    POSITIONS.clear();
    orderbooks.BTC = { bids: [], asks: [], indexPrice: 0 };
    orderbooks.SOL = { bids: [], asks: [], indexPrice: 0 };
  });

  test("liquidates long when index price is at/below liquidation price", () => {
    createOrder(makeOrder({ side: SIDE.LONG, price: 47_900, qty: 3, userId: 1 }));
    POSITIONS.set(
      "99_BTC",
      makePosition({
        userId: 99,
        market: "BTC",
        size: 2,
        estimatedLiquidationPrice: 48_000,
      }),
    );

    liquidatePositions(47_900);

    expect(orderbooks.BTC.bids).toHaveLength(1);
    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(1);
  });

  test("liquidates short when index price is at/above liquidation price", () => {
    createOrder(makeOrder({ side: SIDE.SHORT, price: 52_100, qty: 4, userId: 2 }));
    POSITIONS.set(
      "100_BTC",
      makePosition({
        userId: 100,
        market: "BTC",
        size: -1.5,
        estimatedLiquidationPrice: 52_000,
      }),
    );

    liquidatePositions(52_100);

    expect(orderbooks.BTC.asks).toHaveLength(1);
    expect(orderbooks.BTC.asks[0]?.availableQty).toBe(2.5);
  });

  test("does not liquidate long when index price is above liquidation price", () => {
    createOrder(makeOrder({ side: SIDE.LONG, price: 47_900, qty: 3, userId: 1 }));
    POSITIONS.set(
      "101_BTC",
      makePosition({
        userId: 101,
        market: "BTC",
        size: 2,
        estimatedLiquidationPrice: 48_000,
      }),
    );

    liquidatePositions(48_100);

    expect(orderbooks.BTC.bids).toHaveLength(1);
    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(3);
  });

  test("skips zero-size positions", () => {
    createOrder(makeOrder({ side: SIDE.SHORT, price: 50_000, qty: 1, userId: 5 }));
    POSITIONS.set(
      "102_BTC",
      makePosition({
        userId: 102,
        market: "BTC",
        size: 0,
        estimatedLiquidationPrice: 49_000,
      }),
    );

    liquidatePositions(48_000);

    expect(orderbooks.BTC.asks).toHaveLength(1);
    expect(orderbooks.BTC.asks[0]?.availableQty).toBe(1);
  });
});
