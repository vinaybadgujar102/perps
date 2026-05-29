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
  GET_ACCOUNT_STATE = "get_account_state",
  GET_OPEN_POSITIONS = "get_open_positions",
  GET_ORDERBOOK = "get_orderbook",
  CREDIT_BALANCE = "credit_balance",
}

export enum RESPONSE_KINDS {
  CREATE_USER_RESPONSE = "create_user_response",
  CREATE_ORDER_RESPONSE = "create_order_response",
  GET_ACCOUNT_STATE_RESPONSE = "get_account_state_response",
  GET_OPEN_POSITIONS_RESPONSE = "get_open_positions_response",
  GET_ORDERBOOK_RESPONSE = "get_orderbook_response",
  CREDIT_BALANCE_RESPONSE = "credit_balance_response",
}

export enum TICK_KINDS {
  MARK_PRICE = "mark_price",
}

export enum ORDER_TYPE {
  MARKET_ORDER = "market_order",
  LIMIT_ORDER = "LIMIT_ORDER",
}

export enum SIDE {
  LONG = "LONG",
  SHORT = "SHORT",
}

export type Side = SIDE;

//------------------------------------------------//

export const createUserPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CREATE_USER),
  payload: z.object({
    userId: z.number(),
  }),
});

export const createUserResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.CREATE_USER_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z
      .object({
        userId: z.number().int().positive(),
      })
      .nullable(),
  }),
});

export const createOrderPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CREATE_ORDER),
  userId: z.number(),
  payload: z.object({
    id: z.string(),
    market: z.string(),
    side: z.nativeEnum(SIDE),
    qty: z.number(),
    orderType: z.enum(ORDER_TYPE),
    price: z.number(),
  }),
});

export const markPriceTickSchema = z.object({
  kind: z.literal(TICK_KINDS.MARK_PRICE),
  payload: z.record(z.string(), z.number()),
});

export const fillSchema = z.object({
  id: z.string(),
  market: z.string(),
  makerId: z.number(),
  takerId: z.number(),
  price: z.number(),
  makerOrderId: z.string(),
  takerOrderId: z.string(),
  filledQty: z.number(),
  takerSide: z.nativeEnum(SIDE),
  makerSide: z.nativeEnum(SIDE),
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

export const getAccountStatePayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.GET_ACCOUNT_STATE),
  payload: z.object({
    userId: z.number().int().positive(),
  }),
});

export const getAccountStateResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.GET_ACCOUNT_STATE_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z
      .object({
        balanceUsd: z.number(),
        lockedMarginUsd: z.number(),
        availableMarginUsd: z.number(),
      })
      .nullable(),
  }),
});

export const getOpenPositionsPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.GET_OPEN_POSITIONS),
  payload: z.object({
    userId: z.number().int().positive(),
  }),
});

export const openPositionSchema = z.object({
  market: z.string(),
  side: z.nativeEnum(SIDE),
  size: z.number(),
  averageEntryPrice: z.number(),
  collateralUser: z.number(),
  estimatedLiquidationPrice: z.number(),
  realizedPnl: z.number(),
});

export const getOpenPositionsResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.GET_OPEN_POSITIONS_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z.array(openPositionSchema).nullable(),
  }),
});

export const getOrderbookPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.GET_ORDERBOOK),
  payload: z.object({
    market: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  }),
});

export const orderbookLevelSchema = z.object({
  price: z.number(),
  qty: z.number(),
});

export const getOrderbookResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.GET_ORDERBOOK_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z
      .object({
        bids: z.array(orderbookLevelSchema),
        asks: z.array(orderbookLevelSchema),
        bestBid: orderbookLevelSchema.nullable(),
        bestAsk: orderbookLevelSchema.nullable(),
      })
      .nullable(),
  }),
});

export const creditBalancePayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CREDIT_BALANCE),
  payload: z.object({
    userId: z.number().int().positive(),
    amountUsd: z.number().positive(),
    onrampId: z.string().uuid(),
  }),
});

export const creditBalanceResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.CREDIT_BALANCE_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z
      .object({
        balanceUsd: z.number(),
        lockedMarginUsd: z.number(),
        availableMarginUsd: z.number(),
        creditedAmountUsd: z.number(),
        onrampId: z.string().uuid(),
      })
      .nullable(),
  }),
});

export const tradeEngineResponseSchema = z.discriminatedUnion("kind", [
  createUserResponseSchema,
  createOrderResponseSchema,
  getAccountStateResponseSchema,
  getOpenPositionsResponseSchema,
  getOrderbookResponseSchema,
  creditBalanceResponseSchema,
]);

export type TradeEngineResponse = z.infer<typeof tradeEngineResponseSchema>;

export const eventSchema = z.discriminatedUnion("kind", [
  createUserPayloadSchema,
  createUserResponseSchema,
  markPriceTickSchema,
  createOrderPayloadSchema,
  createOrderResponseSchema,
  getAccountStatePayloadSchema,
  getAccountStateResponseSchema,
  getOpenPositionsPayloadSchema,
  getOpenPositionsResponseSchema,
  getOrderbookPayloadSchema,
  getOrderbookResponseSchema,
  creditBalancePayloadSchema,
  creditBalanceResponseSchema,
]);

export const AssetConfig: Record<
  string,
  {
    symbol: string;
    priceScale: number;
    quantityScale: number;
    maxLeverage: number;
  }
> = {
  BTC: {
    symbol: "BTC",
    priceScale: 2,
    quantityScale: 2,
    maxLeverage: 20,
  },
};

export type Position = {
  id: string;
  orderId: string;
  userId: number;
  market: string;
  size: number;
  estimatedLiquidationPrice: number;
  averageEntryPrice: number;
  collateralUser: number;
  realizedPnl: number;
  createdAt: Date;
};
