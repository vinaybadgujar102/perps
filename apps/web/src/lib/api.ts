import { z } from "zod";
import { apiEnvelopeSchema, get, requestJson } from "./api-envelope";
import { loadSession } from "./auth-storage";

const marketSchema = z.object({
  symbol: z.string(),
  priceScale: z.number(),
  quantityScale: z.number(),
  maxLeverage: z.number(),
  isActive: z.boolean(),
});

const orderbookLevelSchema = z.object({
  price: z.number(),
  qty: z.number(),
});

const marketsResponseSchema = apiEnvelopeSchema(
  z.object({
    markets: z.array(marketSchema),
  }),
);

const marketResponseSchema = apiEnvelopeSchema(
  z.object({
    market: marketSchema,
  }),
);

const orderbookResponseSchema = apiEnvelopeSchema(
  z.object({
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
);

const accountStateResponseSchema = apiEnvelopeSchema(
  z.object({
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
);

const onrampDepositResponseSchema = apiEnvelopeSchema(
  z.object({
    onrampId: z.string().uuid(),
    amountUsd: z.number(),
    balanceUsd: z.number(),
    availableMarginUsd: z.number(),
  }),
);

const fillSchema = z.object({
  id: z.string(),
  market: z.string(),
  makerId: z.number(),
  takerId: z.number(),
  price: z.number(),
  orderId: z.string(),
  filledQty: z.number(),
  takerSide: z.string(),
  makerSide: z.string(),
  timestamp: z.number(),
});

const createOrderResponseSchema = apiEnvelopeSchema(
  z.object({
    success: z.boolean(),
    message: z.string().nullable(),
    data: z.array(fillSchema).nullable(),
  }),
);

export const ORDER_SIDE = ["LONG", "SHORT"] as const;
export const ORDER_TYPE = ["LIMIT_ORDER", "market_order"] as const;

export type OrderSide = (typeof ORDER_SIDE)[number];
export type OrderType = (typeof ORDER_TYPE)[number];

export type CreateOrderInput = {
  market: string;
  side: OrderSide;
  qty: number;
  orderType: OrderType;
  price: number;
};

export type Fill = z.infer<typeof fillSchema>;

export type CreateOrderResult = {
  success: boolean;
  message: string | null;
  fills: Fill[];
};

export type Market = z.infer<typeof marketSchema>;
export type OrderbookData = NonNullable<
  z.infer<typeof orderbookResponseSchema>["data"]
>["data"];
export type AccountState = NonNullable<
  z.infer<typeof accountStateResponseSchema>["data"]
>["data"];
export type OnrampDepositResult = NonNullable<
  z.infer<typeof onrampDepositResponseSchema>["data"]
>;

export { apiEnvelopeSchema } from "./api-envelope";

export const getAuthHeaders = (): HeadersInit => {
  const session = loadSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
};

export const fetchMarkets = async (): Promise<Market[]> => {
  const response = await get("/markets", marketsResponseSchema);
  if (!response.success || !response.data) {
    throw new Error(response.error ?? "Failed to load markets");
  }
  return response.data.markets;
};

export const fetchMarket = async (symbol: string): Promise<Market> => {
  const response = await get(`/markets/${symbol}`, marketResponseSchema);
  if (!response.success || !response.data) {
    throw new Error(response.error ?? "Failed to load market");
  }
  return response.data.market;
};

export const fetchOrderbook = async (symbol: string): Promise<OrderbookData> => {
  const response = await get(`/orderbook/${symbol}`, orderbookResponseSchema);
  if (!response.success || !response.data?.success || !response.data.data) {
    throw new Error(response.error ?? response.data?.message ?? "Failed to load orderbook");
  }
  return response.data.data;
};

export const fetchAccountState = async (userId: number): Promise<AccountState> => {
  const response = await requestJson(`/account/${userId}`, accountStateResponseSchema, {
    headers: getAuthHeaders(),
  });

  if (!response.success || !response.data?.success || !response.data.data) {
    throw new Error(response.error ?? response.data?.message ?? "Failed to load account");
  }

  return response.data.data;
};

export const createOnrampDeposit = async (amountUsd: number): Promise<OnrampDepositResult> => {
  const response = await requestJson("/onramp", onrampDepositResponseSchema, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ amountUsd }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error ?? "Deposit failed");
  }

  return response.data;
};

export const createOrder = async (input: CreateOrderInput): Promise<CreateOrderResult> => {
  const response = await requestJson("/order", createOrderResponseSchema, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error ?? "Order failed");
  }

  const result = response.data;
  if (!result.success) {
    throw new Error(result.message ?? "Order failed");
  }

  return {
    success: result.success,
    message: result.message,
    fills: result.data ?? [],
  };
};
