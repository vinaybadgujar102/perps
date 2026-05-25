import { ORDER_TYPE } from "@repo/sharedtypes";
import { number, z } from "zod";

export const createOrderSchema = z.object({
  market: z.string(),
  type: z.enum(["SHORT", "LONG"]),
  qty: z.number(),
  orderType: z.enum(ORDER_TYPE),
  price: z.number(),
});
