import { z } from "zod";

export const onrampDepositSchema = z.object({
  amountUsd: z.number().positive(),
});
