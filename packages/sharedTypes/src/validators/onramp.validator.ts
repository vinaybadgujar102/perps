import { z } from "zod";

export const onrampDepositSchema = z.object({
  amountUsd: z.number().positive(),
});

export const onRampCaptureSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  status: z.string(),
  signature: z.string().optional(),
});
export type OnrampDepositInput = z.infer<typeof onrampDepositSchema>;

export type OnrampDepositResult = {
  onrampId: string;
  amountUsd: number;
  balanceUsd: number;
  availableMarginUsd: number;
};

export type RazorPayPaymentsObject = {
  amount: number;
  amount_due: number;
  amount_paid: number;
  attempts: number;
  created_at: number;
  currency: string;
  entity: string;
  id: string;
  notes: string[];
  offer_id: string | null;
  receipt: string | null;
  status: string;
};

export type DepositRecord = {
  orderId: string;
  paymentId: string | null;
  status: "CREATED" | "SUCCESS" | "FAILED";
  amountUsd: number;
  createdAt: number;
};

export type DepositHistoryListData = {
  deposits: DepositRecord[];
};
