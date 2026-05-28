import { beforeEach, describe, expect, test } from "bun:test";
import { ORDER_TYPE } from "@repo/sharedtypes";
import { createOrder } from "./utils/order.util";
import { orderbooks } from "./inMemoryStates";
import type { Order } from "./types";

function resetOrderbooks() {
  orderbooks.BTC = { bids: [], asks: [], indexPrice: 0 };
  orderbooks.SOL = { bids: [], asks: [], indexPrice: 0 };
}

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

describe("createOrder", () => {
  beforeEach(() => {
    resetOrderbooks();
  });

  test("returns failure when orderbook does not exist", () => {
    const result = createOrder(
      makeOrder({ market: "ETH", side: "LONG", price: 100, qty: 1 }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Orderbook not found");
    expect(result.data).toEqual([]);
  });

  test("places LONG limit on bids when book is empty", () => {
    const result = createOrder(makeOrder({ side: "LONG", price: 50_000, qty: 2 }));

    expect(result.success).toBe(true);
    expect(result.message).toBe("order placed in orderbook");
    expect(result.data).toEqual([]);
    expect(orderbooks.BTC.bids).toHaveLength(1);
    expect(orderbooks.BTC.bids[0]?.price).toBe(50_000);
    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(2);
    expect(orderbooks.BTC.asks).toHaveLength(0);
  });

  test("places SHORT limit on asks when book is empty", () => {
    const result = createOrder(makeOrder({ side: "SHORT", price: 51_000, qty: 3 }));

    expect(result.success).toBe(true);
    expect(result.message).toBe("order placed in orderbook");
    expect(result.data).toEqual([]);
    expect(orderbooks.BTC.asks).toHaveLength(1);
    expect(orderbooks.BTC.asks[0]?.price).toBe(51_000);
    expect(orderbooks.BTC.asks[0]?.availableQty).toBe(3);
    expect(orderbooks.BTC.bids).toHaveLength(0);
  });

  test("fully fills LONG taker against resting SHORT ask", () => {
    createOrder(
      makeOrder({ side: "SHORT", price: 100, qty: 10, userId: 1 }),
    );

    const result = createOrder(
      makeOrder({ side: "LONG", price: 100, qty: 5, userId: 2 }),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Order fully executed");
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.makerId).toBe(1);
    expect(result.data?.[0]?.takerId).toBe(2);
    expect(result.data?.[0]?.price).toBe(100);
    expect(orderbooks.BTC.asks[0]?.availableQty).toBe(5);
    const restingAsk = orderbooks.BTC.asks[0]?.orders[0];
    expect(restingAsk?.filledQty).toBe(5);
    expect(restingAsk?.qty).toBe(10);
  });

  test("decrements ask availableQty when maker is partially filled", () => {
    createOrder(
      makeOrder({ side: "SHORT", price: 100, qty: 10, userId: 1 }),
    );

    createOrder(makeOrder({ side: "LONG", price: 100, qty: 3, userId: 2 }));

    expect(orderbooks.BTC.asks[0]?.availableQty).toBe(7);
    expect(orderbooks.BTC.asks[0]?.orders[0]?.filledQty).toBe(3);
  });

  test("partially fills taker and places remainder on bids", () => {
    createOrder(
      makeOrder({ side: "SHORT", price: 100, qty: 4, userId: 1 }),
    );

    const result = createOrder(
      makeOrder({ side: "LONG", price: 101, qty: 10, userId: 2 }),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("order placed in orderbook");
    expect(result.data).toHaveLength(1);
    expect(orderbooks.BTC.asks).toHaveLength(0);
    expect(orderbooks.BTC.bids).toHaveLength(1);
    expect(orderbooks.BTC.bids[0]?.price).toBe(101);
    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(6);
    expect(orderbooks.BTC.bids[0]?.orders[0]?.filledQty).toBe(4);
    expect(orderbooks.BTC.bids[0]?.orders[0]?.qty).toBe(10);
  });

  test("sweeps multiple ask levels and rests remainder on bids", () => {
    createOrder(
      makeOrder({ side: "SHORT", price: 100, qty: 10, userId: 1 }),
    );
    createOrder(
      makeOrder({ side: "SHORT", price: 102, qty: 5, userId: 3 }),
    );
    createOrder(
      makeOrder({ side: "SHORT", price: 105, qty: 8, userId: 4 }),
    );

    const result = createOrder(
      makeOrder({ side: "LONG", price: 106, qty: 25, userId: 2 }),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("order placed in orderbook");
    expect(result.data).toHaveLength(3);
    expect(orderbooks.BTC.asks).toHaveLength(0);
    expect(orderbooks.BTC.bids).toHaveLength(1);
    expect(orderbooks.BTC.bids[0]?.price).toBe(106);
    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(2);
    expect(orderbooks.BTC.bids[0]?.orders[0]?.qty).toBe(25);
    expect(orderbooks.BTC.bids[0]?.orders[0]?.filledQty).toBe(23);
  });

  test("fully sweeps asks and leaves no bid when taker qty equals total liquidity", () => {
    createOrder(
      makeOrder({ side: "SHORT", price: 100, qty: 10, userId: 1 }),
    );
    createOrder(
      makeOrder({ side: "SHORT", price: 102, qty: 5, userId: 3 }),
    );
    createOrder(
      makeOrder({ side: "SHORT", price: 105, qty: 8, userId: 4 }),
    );

    const result = createOrder(
      makeOrder({ side: "LONG", price: 106, qty: 20, userId: 2 }),
    );

    expect(result.message).toBe("Order fully executed");
    expect(result.data).toHaveLength(3);
    expect(orderbooks.BTC.asks).toHaveLength(1);
    expect(orderbooks.BTC.asks[0]?.price).toBe(105);
    expect(orderbooks.BTC.asks[0]?.availableQty).toBe(3);
    expect(orderbooks.BTC.bids).toHaveLength(0);
  });

  test("fully fills SHORT taker against resting LONG bid", () => {
    createOrder(
      makeOrder({ side: "LONG", price: 200, qty: 7, userId: 1 }),
    );

    const result = createOrder(
      makeOrder({ side: "SHORT", price: 200, qty: 3, userId: 2 }),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Order fully executed");
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.makerId).toBe(1);
    expect(result.data?.[0]?.takerId).toBe(2);
    expect(result.data?.[0]?.price).toBe(200);
    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(4);
    const restingBid = orderbooks.BTC.bids[0]?.orders[0];
    expect(restingBid?.filledQty).toBe(3);
    expect(restingBid?.qty).toBe(7);
  });

  test("decrements bid availableQty when maker is partially filled", () => {
    createOrder(
      makeOrder({ side: "LONG", price: 200, qty: 8, userId: 1 }),
    );

    createOrder(makeOrder({ side: "SHORT", price: 200, qty: 2, userId: 2 }));

    expect(orderbooks.BTC.bids[0]?.availableQty).toBe(6);
    expect(orderbooks.BTC.bids[0]?.orders[0]?.filledQty).toBe(2);
  });

  test("does not match when LONG price is below best ask", () => {
    createOrder(
      makeOrder({ side: "SHORT", price: 100, qty: 5, userId: 1 }),
    );

    const result = createOrder(
      makeOrder({ side: "LONG", price: 99, qty: 2, userId: 2 }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(orderbooks.BTC.asks).toHaveLength(1);
    expect(orderbooks.BTC.bids).toHaveLength(1);
    expect(orderbooks.BTC.bids[0]?.price).toBe(99);
  });
});
