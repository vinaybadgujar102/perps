import { z } from "zod";
import { SYMBOLS } from "../enums";

export const getPositionsParamsSchema = z.object({
  userId: z.coerce.number(),
});

export const closePositionParamsSchema = z.object({
  market: z.enum(SYMBOLS),
});
