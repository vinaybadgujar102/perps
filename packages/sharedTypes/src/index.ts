import { z } from "zod";

export enum SYMBOLS {
  BTC = "BTC",
}

export enum QUEUES {
  SEND_QUEUE = "send_queue",
  RESPONSE_QUEUE = "response_queue",
}

export enum EVENT_KINDS {
  CREATE_ORDER = "create_order",
  CREATE_USER = "create_user",
}

export enum RESPONSE_KINDS {
  CREATE_ORDER_RESPONSE = "create_order_response",
}

export enum TICK_KINDS {
  MARK_PRICE = "mark_price",
}

//------------------------------------------------//

export const createUserPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CREATE_USER),
  payload: z.object({
    userId: z.number(),
  }),
});

export const createOrderPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CREATE_ORDER),
  userId: z.number(),
  payload: z.object({
    id: z.string(),
    market: z.string(),
    type: z.enum(["SHORT", "LONG"]),
    qty: z.number(),
    margin: z.number(),
    orderType: z.enum(["LIMIT", "MARKET"]),
    price: z.number(),
  }),
});

export const markPriceTickSchema = z.object({
  kind: z.literal(TICK_KINDS.MARK_PRICE),
  payload: z.record(z.enum(SYMBOLS), z.number()),
});

export const fillSchema = z.object({
  id: z.string(),
  market: z.string(),
  makerId: z.number(),
  takerId: z.number(),
  price: z.number(),
  orderId: z.string(),
  timestamp: z.number(),
});

export const createOrderResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.CREATE_ORDER_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z.array(fillSchema).nullable(),
  }),
});

export const eventSchema = z.discriminatedUnion("kind", [
  createUserPayloadSchema,
  markPriceTickSchema,
  createOrderPayloadSchema,
  createOrderResponseSchema,
]);

export const AssetConfig: Record<
  string,
  { symbol: string; priceScale: number; quantityScale: number }
> = {
  BTC: {
    symbol: "BTC",
    priceScale: 2,
    quantityScale: 2,
  },
};

type Position = {
  id: string;
  orderId: string;
  market: string;
  type: "LONG" | "SHORT";
};
