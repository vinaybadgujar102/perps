import type { Fill, ORDER_TYPE, Position, Side } from "@repo/sharedtypes";

export type { Fill };
import { z } from "zod";

export type User = {
  userId: number;
  balance: number;
  lockedBalance: number;
  activePositions: Map<string, Position>;
};

export const BinanceMarkPriceResponseSchema = z.object({
  data: z.object({
    e: z.string(), // Event type
    E: z.number(), // Event time in microseconds
    s: z.string(), // Symbol
    p: z.string(), // Mark price
    f: z.string(), // Estimated funding rate
    i: z.string(), // Index price
    n: z.number(), // Next funding timestamp in milliseconds
    T: z.number(), // Engine timestamp in microseconds
  }),
  stream: z.string(),
});

export type BinanceMarkPriceResponse = z.infer<
  typeof BinanceMarkPriceResponseSchema
>;

export type Order = {
  id: string;
  market: string;
  qty: number;
  filledQty: number;
  price: number;
  userId: number;
  orderType: ORDER_TYPE;
  side: Side;
  timestamp: number;
};
