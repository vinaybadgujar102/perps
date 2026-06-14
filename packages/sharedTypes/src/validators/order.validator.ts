import { z } from "zod";
import { ORDER_TYPE, SIDE } from "../enums";

export const fillSchema = z.object({
  id: z.string(),
  market: z.string(),
  makerId: z.number(),
  takerId: z.number(),
  price: z.number(),
  makerOrderId: z.string(),
  takerOrderId: z.string(),
  filledQty: z.number(),
  takerSide: z.enum(SIDE),
  makerSide: z.enum(SIDE),
  timestamp: z.number(),
});

export type Fill = z.infer<typeof fillSchema>;

export const createOrderSchema = z.object({
  market: z.string(),
  side: z.enum(SIDE),
  qty: z.number(),
  orderType: z.enum(ORDER_TYPE),
  price: z.number(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type CreateOrderData = {
  success: boolean;
  message: string | null;
  data: Fill[] | null;
};

export type CancelOrderPayload = {
  orderId: string;
  market: string;
  cancelledQty: number;
};

export type CancelOrderData = {
  success: boolean;
  message: string | null;
  data: CancelOrderPayload | null;
};

export const cancelOrderParamsSchema = z.object({
  orderId: z.uuid(),
});

export const openOrderSchema = z.object({
  id: z.uuid(),
  market: z.string(),
  side: z.enum(SIDE),
  orderType: z.enum(ORDER_TYPE),
  price: z.number(),
  qty: z.number(),
  filledQty: z.number(),
});

export type OpenOrder = z.infer<typeof openOrderSchema>;
