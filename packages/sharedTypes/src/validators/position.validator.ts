import { z } from "zod";

export const getPositionsParamsSchema = z.object({
  userId: z.coerce.number(),
});
