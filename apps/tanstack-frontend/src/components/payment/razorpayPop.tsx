import { useCapturePaymentMutation } from "#/hooks/payments/use-capture-payment";
import { useEffect } from "react";

// Function to load script and append in DOM tree.
const loadScript = (src: string) =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      console.log("razorpay loaded successfully");
      resolve(true);
    };
    script.onerror = () => {
      console.log("error in loading razorpay");
      resolve(false);
    };
    document.body.appendChild(script);
  });

export const RenderRazorpay = ({
  orderId,
  keyId,
  currency,
  amount,
}: {
  orderId: string;
  keyId: string;
  currency: string;
  amount: number;
}) => {
  const { mutateAsync: captureOrder } = useCapturePaymentMutation();

  const display = async (options: any) => {
    const scriptResponse = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js",
    );
    if (!scriptResponse) {
      console.log("Error in loading script");
      return;
    }

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", async (response) => {
      await captureOrder({
        orderId: response.error.metadata.order_id,
        paymentId: response.error.metadata.payment_id,
        status: "failed",
      });
    });

    rzp.on("payment.captured", (response) => {});

    rzp.open();
  };

  const handlePayment = () => {};

  useEffect(() => {
    display({
      key: keyId,
      amount,
      currency,
      name: "Perps",
      description: "Perpetuals Markets",
      order_id: orderId,
      handler: async (response: any) => {
        console.log("Payment success", response);
        await captureOrder({
          orderId: response.razorpay_order_id,
          status: "success",
          paymentId: response.razorpay_payment_id,
        });
      },
    });
  }, [orderId]);

  return null;
};

export default RenderRazorpay;
