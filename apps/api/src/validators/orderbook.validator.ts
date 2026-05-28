import { z } from "zod";

export const getOrderbookParamsSchema = z.object({
  market: z.string().trim().min(1).transform((value) => value.toUpperCase()),
});
