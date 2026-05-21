import { number, z } from "zod";

export const createOrderSchema = z.object({
  market: z.string(),
  type: z.enum(["SHORT", "LONG"]),
  qty: z.number(),
  margin: z.number(),
  orderType: z.enum(["LIMIT", "MARKET"]),
  price: z.number(),
});
