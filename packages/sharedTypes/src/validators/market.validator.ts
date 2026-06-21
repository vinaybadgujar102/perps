import { z } from "zod";

const marketSymbolSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value === value.toUpperCase(), {
    message: "Symbol must be uppercase",
  });

export const marketSymbolParamsSchema = z.object({
  symbol: marketSymbolSchema,
});

export const createMarketSchema = z.object({
  symbol: marketSymbolSchema,
  priceScale: z.number().int().min(0),
  quantityScale: z.number().int().min(0),
  maxLeverage: z.number().int().min(1),
  isActive: z.boolean(),
});

export const updateMarketSchema = z.object({
  symbol: marketSymbolSchema,
  priceScale: z.number().int().min(0),
  quantityScale: z.number().int().min(0),
  maxLeverage: z.number().int().min(1),
  isActive: z.boolean(),
});
