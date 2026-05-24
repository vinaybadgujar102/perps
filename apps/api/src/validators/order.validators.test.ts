import { describe, expect, test } from "bun:test";
import { createOrderSchema } from "./order.validators";

describe("createOrderSchema", () => {
  test("accepts valid API create order body", () => {
    const body = {
      market: "BTC",
      type: "LONG" as const,
      qty: 5,
      margin: 100,
      orderType: "LIMIT" as const,
      price: 50_000,
    };

    expect(createOrderSchema.parse(body)).toEqual(body);
  });

  test("rejects missing required fields", () => {
    expect(() =>
      createOrderSchema.parse({
        market: "BTC",
        type: "LONG",
        qty: 5,
      }),
    ).toThrow();
  });

  test("rejects invalid orderType", () => {
    expect(() =>
      createOrderSchema.parse({
        market: "BTC",
        type: "LONG",
        qty: 5,
        margin: 100,
        orderType: "STOP",
        price: 50_000,
      }),
    ).toThrow();
  });
});
