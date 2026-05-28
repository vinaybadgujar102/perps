import { z } from "zod";
import { apiEnvelopeSchema, get } from "./api-envelope";
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
    kind: z.string(),
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
  }),
);

export type Market = z.infer<typeof marketSchema>;
export type OrderbookData = NonNullable<
  z.infer<typeof orderbookResponseSchema>["data"]
>["data"]["data"];

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
  if (!response.success || !response.data?.data.success || !response.data.data.data) {
    throw new Error(response.error ?? response.data?.data.message ?? "Failed to load orderbook");
  }
  return response.data.data.data;
};
