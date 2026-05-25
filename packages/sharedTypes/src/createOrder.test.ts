import { describe, expect, test } from "bun:test";
import {
  AssetConfig,
  createOrderPayloadSchema,
  createOrderResponseSchema,
  EVENT_KINDS,
  RESPONSE_KINDS,
} from "./index";

describe("createOrderPayloadSchema", () => {
  test("accepts valid CREATE_ORDER payload without client-supplied margin", () => {
    const payload = {
      requestId: "req-1",
      kind: EVENT_KINDS.CREATE_ORDER,
      userId: 1,
      payload: {
        id: "order-1",
        market: "BTC",
        type: "LONG" as const,
        qty: 10,
        orderType: "LIMIT_ORDER" as const,
        price: 50_000,
      },
    };

    const parsed = createOrderPayloadSchema.parse(payload);
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.payload.market).toBe("BTC");
    expect(parsed.payload.type).toBe("LONG");
    expect("margin" in parsed.payload).toBe(false);
  });

  test("strips legacy margin field instead of rejecting it", () => {
    const parsed = createOrderPayloadSchema.parse({
      requestId: "req-legacy",
      kind: EVENT_KINDS.CREATE_ORDER,
      userId: 1,
      payload: {
        id: "order-legacy",
        market: "BTC",
        type: "LONG",
        qty: 1,
        margin: 999,
        orderType: "LIMIT_ORDER",
        price: 50_000,
      },
    });

    expect("margin" in parsed.payload).toBe(false);
  });

  test("rejects invalid order type", () => {
    expect(() =>
      createOrderPayloadSchema.parse({
        requestId: "req-1",
        kind: EVENT_KINDS.CREATE_ORDER,
        userId: 1,
        payload: {
          id: "order-1",
          market: "BTC",
          type: "BUY",
          qty: 10,
          orderType: "LIMIT_ORDER",
          price: 50_000,
        },
      }),
    ).toThrow();
  });
});

describe("createOrderResponseSchema", () => {
  test("accepts valid CREATE_ORDER_RESPONSE", () => {
    const response = {
      kind: RESPONSE_KINDS.CREATE_ORDER_RESPONSE,
      requestId: "req-1",
      data: {
        success: true,
        message: "Order fully executed",
        data: [
          {
            id: "fill-1",
            market: "BTC",
            makerId: 1,
            takerId: 2,
            price: 100,
            orderId: "order-1",
            timestamp: Date.now(),
          },
        ],
      },
    };

    const parsed = createOrderResponseSchema.parse(response);
    expect(parsed.data.success).toBe(true);
    expect(parsed.data.data).toHaveLength(1);
  });
});

describe("AssetConfig", () => {
  test("defines max leverage for supported markets", () => {
    expect(AssetConfig.BTC.maxLeverage).toBe(20);
  });
});
