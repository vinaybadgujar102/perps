import { useEffect, useRef } from "react";

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
  const display = async (options: any) => {
    const scriptResponse = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js",
    );
    if (!scriptResponse) {
      console.log("Error in loading script");
      return;
    }

    const rzp = new window.Razorpay(options);

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
    });
  });

  return null;
};

export default RenderRazorpay;
