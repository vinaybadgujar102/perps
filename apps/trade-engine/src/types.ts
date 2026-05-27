import type { ORDER_TYPE, Position } from "@repo/sharedtypes";
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

export type PriceLevel = {
  price: number;
  availableQty: number;
  orders: Order[];
};

export type Order = {
  id: string;
  market: string;
  qty: number;
  filledQty: number;
  price: number;
  userId: number;
  orderType: ORDER_TYPE;
  type: "LONG" | "SHORT";
  timestamp: number;
};

export type Fill = {
  id: string;
  market: string;
  makerId: number;
  takerId: number;
  price: number;
  makerOrderId: string;
  takerOrderId: string;
  filledQty: number;
  makerOrderType: "LONG" | "SHORT";
  takerOrderType: "LONG" | "SHORT";
  timestamp: number;
};
