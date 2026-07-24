import { z } from "zod";

export const candleIntervalSchema = z.enum(["1m", "5m"]);
export type CandleInterval = z.infer<typeof candleIntervalSchema>;

export const getCandlesQuerySchema = z.object({
  interval: candleIntervalSchema.default("1m"),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const candleSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

export const candlesResponseSchema = z.object({
  market: z.string(),
  interval: candleIntervalSchema,
  candles: z.array(candleSchema),
  /** True when OHLC is synthetic (hosted demo / no Timescale). */
  synthetic: z.boolean().optional(),
});

export type Candle = z.infer<typeof candleSchema>;
export type CandlesResponse = z.infer<typeof candlesResponseSchema>;
export type GetCandlesQuery = z.infer<typeof getCandlesQuerySchema>;
