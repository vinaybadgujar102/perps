import { describe, expect, test } from "bun:test";
import { createOrderSchema } from "./order.validators";

describe("createOrderSchema", () => {
  test("accepts valid API create order body without margin", () => {
    const body = {
      market: "BTC",
      side: "LONG" as const,
      qty: 5,
      orderType: "LIMIT_ORDER" as const,
      price: 50_000,
    };

    expect(createOrderSchema.parse(body)).toEqual(body);
  });

  test("rejects missing required fields", () => {
    expect(() =>
      createOrderSchema.parse({
        market: "BTC",
        side: "LONG",
        qty: 5,
      }),
    ).toThrow();
  });

  test("rejects invalid orderType", () => {
    expect(() =>
      createOrderSchema.parse({
        market: "BTC",
        side: "LONG",
        qty: 5,
        orderType: "STOP",
        price: 50_000,
      }),
    ).toThrow();
  });
});
