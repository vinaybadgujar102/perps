import Razorpay from "razorpay";

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

export const createDepositOrder = async (deposit_amount: number) => {
  // add reciept later
  console.log("here");
  const payment = await razorpayInstance.orders
    .create({
      amount: deposit_amount,
      currency: "USD",
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  console.log(payment);

  return payment;
};
