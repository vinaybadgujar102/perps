import { z } from "zod";

export const createMarketSchema = z.object({
  symbol: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  priceScale: z.number().int().min(0),
  quantityScale: z.number().int().min(0),
  maxLeverage: z.number().int().min(1),
  isActive: z.boolean(),
});

export const updateMarketSchema = z.object({
  symbol: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  priceScale: z.number().int().min(0),
  quantityScale: z.number().int().min(0),
  maxLeverage: z.number().int().min(1),
  isActive: z.boolean(),
});
