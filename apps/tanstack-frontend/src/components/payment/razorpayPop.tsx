import { useCapturePaymentMutation } from "#/hooks/payments/use-capture-payment";
import { setPaymentFlashToast } from "#/lib/payment-flash";
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

type RazorpayInstance = {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: RazorpayPaymentResponse) => void) => void;
};

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  error?: {
    metadata: {
      order_id: string;
      payment_id: string;
    };
  };
};

export const RenderRazorpay = ({
  orderId,
  keyId,
  currency,
  amount,
  onComplete,
  onPaymentSuccess,
}: {
  orderId: string;
  keyId: string;
  currency: string;
  amount: number;
  onComplete?: () => void;
  onPaymentSuccess?: () => void;
}) => {
  const { mutateAsync: captureOrder } = useCapturePaymentMutation();

  const reloadToDashboard = (toast?: {
    variant: "success" | "error";
    title: string;
    message: string;
  }) => {
    if (toast) {
      setPaymentFlashToast(toast);
    }
    onComplete?.();
    window.location.assign("/dashboard");
  };

  const display = async () => {
    const scriptResponse = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js",
    );
    if (!scriptResponse) {
      console.log("Error in loading script");
      return;
    }

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      name: "Perps",
      description: "Perpetuals Markets",
      order_id: orderId,
      modal: {
        ondismiss: () => {
          onComplete?.();
          window.location.reload();
        },
      },
      handler: async (response: RazorpayPaymentResponse) => {
        try {
          await captureOrder({
            orderId: response.razorpay_order_id,
            status: "success",
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          onPaymentSuccess?.();

          reloadToDashboard({
            variant: "success",
            title: "Payment successful",
            message: "See your updated balance in wallet",
          });
        } catch (error) {
          reloadToDashboard({
            variant: "error",
            title: "Deposit failed",
            message:
              error instanceof Error
                ? error.message
                : "Payment went through but balance could not be credited",
          });
        }
      },
    }) as RazorpayInstance;

    rzp.on("payment.failed", async (response) => {
      if (response.error?.metadata) {
        await captureOrder({
          orderId: response.error.metadata.order_id,
          paymentId: response.error.metadata.payment_id,
          status: "failed",
        });
      }

      reloadToDashboard({
        variant: "error",
        title: "Payment failed",
        message: "Please try again",
      });
    });

    rzp.open();
  };

  useEffect(() => {
    display();
  }, [orderId]);

  return null;
};

export default RenderRazorpay;
