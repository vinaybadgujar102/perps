import Razorpay from "razorpay";
import { BASE_CURRENCY_SCALE_FACTOR } from "@repo/sharedtypes";

const keyId = process.env.RAZORPAY_TEST_API_KEY;
const keySecret = process.env.RAZORPAY_TEST_SECRET_KEY;

if (!keyId || !keySecret) {
  throw new Error(
    "RAZORPAY_TEST_API_KEY and RAZORPAY_TEST_SECRET_KEY must be set",
  );
}

export const razorpayInstance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/** @param displayAmountUsd human-readable USD (e.g. 10 = $10.00) */
export const createDepositOrder = async (displayAmountUsd: number) => {
  const payment = await razorpayInstance.orders
    .create({
      amount: Math.round(displayAmountUsd * BASE_CURRENCY_SCALE_FACTOR),
      currency: "USD",
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  return payment;
};
