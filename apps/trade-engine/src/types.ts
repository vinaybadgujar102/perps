import type { Fill, ORDER_TYPE, Position, Side } from "@repo/sharedtypes";
import { ORDER_TYPE as ORDER_TYPE_ENUM, SIDE } from "@repo/sharedtypes";
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

export type SnapshotUser = {
  balance: number;
  lockedBalance: number;
};

export type SnapshotOrder = {
  id: string;
  market: string;
  qty: number;
  filledQty: number;
  price: number;
  userId: number;
  side: Side;
  orderType: ORDER_TYPE;
  timestamp: number;
  leverage: number;
};

export type SnapshotOrderbook = {
  market: string;
  indexPrice: number;
  lastTradedPrice: number;
};

export type Snapshot = {
  users: [number, SnapshotUser][];
  positions: [string, Position][];
  orders: SnapshotOrder[];
  orderbooks: SnapshotOrderbook[];
  lastProcessedId: string;
};

const snapshotUserSchema = z.object({
  balance: z.number(),
  lockedBalance: z.number(),
});

const snapshotOrderSchema = z.object({
  id: z.string(),
  market: z.string(),
  qty: z.number(),
  filledQty: z.number(),
  price: z.number(),
  userId: z.number(),
  side: z.nativeEnum(SIDE),
  orderType: z.nativeEnum(ORDER_TYPE_ENUM),
  timestamp: z.number(),
  leverage: z.number().int(),
});

const snapshotOrderbookSchema = z.object({
  market: z.string(),
  indexPrice: z.number(),
  lastTradedPrice: z.number(),
});

const snapshotPositionSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  userId: z.number(),
  market: z.string(),
  size: z.number(),
  estimatedLiquidationPrice: z.number(),
  averageEntryPrice: z.number(),
  collateralUser: z.number(),
  realizedPnl: z.number(),
  createdAt: z.union([z.string(), z.number()]),
});

export const snapshotSchema = z.object({
  users: z.array(z.tuple([z.number(), snapshotUserSchema])),
  positions: z.array(z.tuple([z.string(), snapshotPositionSchema])),
  orders: z.array(snapshotOrderSchema),
  orderbooks: z.array(snapshotOrderbookSchema),
  lastProcessedId: z.string(),
});
