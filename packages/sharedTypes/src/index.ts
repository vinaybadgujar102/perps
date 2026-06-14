import { z } from "zod";

export * from "./enums";
export * from "./trading/liquidation";
import {
  EVENT_KINDS,
  ORDER_TYPE,
  RESPONSE_KINDS,
  SIDE,
  TICK_KINDS,
} from "./enums";
import { fillSchema, openOrderSchema } from "./validators/order.validator";

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
        userId: z.number(),
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
    userId: z.number(),
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
    userId: z.number(),
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

export const getOpenOrdersPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.GET_OPEN_ORDERS),
  payload: z.object({
    userId: z.number(),
  }),
});

export const getOpenOrdersResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.GET_OPEN_ORDERS_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z.array(openOrderSchema).nullable(),
  }),
});

export const getOrderbookPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.GET_ORDERBOOK),
  payload: z.object({
    market: z
      .string()
      .trim()
      .min(1)
      .transform((value) => value.toUpperCase()),
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
    userId: z.number(),
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

export const cancelOrderPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CANCEL_ORDER),
  userId: z.number(),
  payload: z.object({
    orderId: z.string().uuid(),
  }),
});

export const cancelOrderResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.CANCEL_ORDER_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z
      .object({
        orderId: z.string().uuid(),
        market: z.string(),
        cancelledQty: z.number(),
      })
      .nullable(),
  }),
});

export const closePositionPayloadSchema = z.object({
  requestId: z.string(),
  kind: z.literal(EVENT_KINDS.CLOSE_POSITION),
  userId: z.number(),
  payload: z.object({
    market: z.string(),
  }),
});

export const closePositionResponseSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.CLOSE_POSITION_RESPONSE),
  requestId: z.string(),
  data: z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z.array(fillSchema).nullable(),
  }),
});

export const indexPriceUpdateSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.INDEX_PRICE_UPDATE),
  payload: z.object({
    market: z.string(),
    indexPrice: z.number(),
    timestamp: z.number(),
    fundingRate: z.number().optional(),
    nextFundingTime: z.number().optional(),
  }),
});

export type IndexPriceUpdate = z.infer<typeof indexPriceUpdateSchema>;

export const indexPriceRoom = (market: string) => `indexPrice.${market}`;

export const wsSubscribeSchema = z.object({
  method: z.literal("SUBSCRIBE"),
  params: z.array(z.string()),
});

export const wsUnsubscribeSchema = z.object({
  method: z.literal("UNSUBSCRIBE"),
  params: z.array(z.string()),
});

export const wsClientMessageSchema = z.discriminatedUnion("method", [
  wsSubscribeSchema,
  wsUnsubscribeSchema,
]);

export const indexPricePushSchema = z.object({
  stream: z.string(),
  data: z.object({
    market: z.string(),
    indexPrice: z.number(),
    timestamp: z.number(),
    fundingRate: z.number().optional(),
    nextFundingTime: z.number().optional(),
  }),
});

export const userEventRoom = (userId: number) => `user.${userId}`;

export const userEventUpdateSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.USER_EVENT),
  payload: z.object({
    type: z.literal("LIQUIDATION"),
    userId: z.number(),
    market: z.string(),
    liquidationPrice: z.number(),
    timestamp: z.number(),
  }),
});

export const userEventPushSchema = z.object({
  stream: z.string(),
  data: z.object({
    type: z.literal("LIQUIDATION"),
    userId: z.number(),
    market: z.string(),
    liquidationPrice: z.number(),
    timestamp: z.number(),
  }),
});

export const depthUpdateSchema = z.object({
  kind: z.literal(RESPONSE_KINDS.DEPTH_UPDATE),
  payload: z.object({
    market: z.string(),
    timestamp: z.number(),
    bids: z.array(orderbookLevelSchema),
    asks: z.array(orderbookLevelSchema),
  }),
});

export type DepthUpdate = z.infer<typeof depthUpdateSchema>;

export const depthRoom = (market: string) => `depth.${market}`;

export const depthPushSchema = z.object({
  stream: z.string(),
  data: z.object({
    market: z.string(),
    timestamp: z.number(),
    bids: z.array(orderbookLevelSchema),
    asks: z.array(orderbookLevelSchema),
  }),
});

export const tradeEngineResponseSchema = z.discriminatedUnion("kind", [
  createUserResponseSchema,
  createOrderResponseSchema,
  getAccountStateResponseSchema,
  getOpenPositionsResponseSchema,
  getOpenOrdersResponseSchema,
  getOrderbookResponseSchema,
  creditBalanceResponseSchema,
  cancelOrderResponseSchema,
  closePositionResponseSchema,
]);

export type TradeEngineResponse = z.infer<typeof tradeEngineResponseSchema>;

export const responseQueueSchema = z.discriminatedUnion("kind", [
  createUserResponseSchema,
  createOrderResponseSchema,
  getAccountStateResponseSchema,
  getOpenPositionsResponseSchema,
  getOpenOrdersResponseSchema,
  getOrderbookResponseSchema,
  creditBalanceResponseSchema,
  cancelOrderResponseSchema,
  closePositionResponseSchema,
  indexPriceUpdateSchema,
  depthUpdateSchema,
  userEventUpdateSchema,
]);

export type ResponseQueueMessage = z.infer<typeof responseQueueSchema>;

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
  getOpenOrdersPayloadSchema,
  getOpenOrdersResponseSchema,
  getOrderbookPayloadSchema,
  getOrderbookResponseSchema,
  creditBalancePayloadSchema,
  creditBalanceResponseSchema,
  cancelOrderPayloadSchema,
  cancelOrderResponseSchema,
  closePositionPayloadSchema,
  closePositionResponseSchema,
  indexPriceUpdateSchema,
  depthUpdateSchema,
  userEventUpdateSchema,
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

export * from "./validators";
