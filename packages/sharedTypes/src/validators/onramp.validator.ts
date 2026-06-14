import { z } from "zod";

export const onrampDepositSchema = z.object({
  amountUsd: z.number().positive(),
});

export type OnrampDepositInput = z.infer<typeof onrampDepositSchema>;

export type OnrampDepositResult = {
  onrampId: string;
  amountUsd: number;
  balanceUsd: number;
  availableMarginUsd: number;
};
