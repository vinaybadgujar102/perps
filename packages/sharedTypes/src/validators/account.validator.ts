import { z } from "zod";

export const getAccountParamsSchema = z.object({
  userId: z.coerce.number(),
});
