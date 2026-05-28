import { ORDER_TYPE, SIDE } from "@repo/sharedtypes";
import { z } from "zod";

export const createOrderSchema = z.object({
  market: z.string(),
  side: z.nativeEnum(SIDE),
  qty: z.number(),
  orderType: z.enum(ORDER_TYPE),
  price: z.number(),
});
