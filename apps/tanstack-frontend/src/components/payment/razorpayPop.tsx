import { useCapturePaymentMutation } from "#/hooks/payments/use-capture-payment";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { terminalToast } from "../ui/terminal-toast";
import { toast } from "sonner";
import { templateLiteral } from "zod";

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
  const navigate = useNavigate();

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

      terminalToast.error(404, "Payment Failed! Please try again!");
      navigate({ to: "/dashboard" });
    });

    rzp.on("payment.captured", (response) => {});

    rzp.open();
  };

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
        const data = await captureOrder({
          orderId: response.razorpay_order_id,
          status: "success",
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });

        terminalToast.success(
          "Payment successfull",
          "See your updated balance in wallet",
        );

        navigate({ to: "/dashboard" });
      },
    });
  }, [orderId]);

  return null;
};

export default RenderRazorpay;
