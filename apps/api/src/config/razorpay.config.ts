import Razorpay from "razorpay";

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_TEST_API_KEY,
  key_secret: process.env.RAZORPAY_TEST_SECRET_KEY,
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
    });

  console.log(payment);

  return payment;
};
