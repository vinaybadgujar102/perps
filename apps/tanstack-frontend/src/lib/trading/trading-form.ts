import { ORDER_TYPE } from "@repo/sharedtypes";
import { z } from "zod";

export type TradingFormValues = {
  price: string;
  qty: string;
};

export function createTradingFormSchema(orderType: ORDER_TYPE) {
  const positiveNumber = z
    .string()
    .min(1, "Required")
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0;
    }, "Enter a value greater than zero");

  return z.object({
    price:
      orderType === ORDER_TYPE.LIMIT_ORDER
        ? positiveNumber
        : z.string().optional(),
    qty: positiveNumber,
  });
}
