import { z } from "zod";
import { ORDER_TYPE, SIDE } from "../enums";

export const createOrderSchema = z.object({
  market: z.string(),
  side: z.enum(SIDE),
  qty: z.number(),
  orderType: z.enum(ORDER_TYPE),
  price: z.number(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
