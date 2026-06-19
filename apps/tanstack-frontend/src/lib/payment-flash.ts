import { useEffect } from "react";
import { terminalToast } from "#/components/ui/terminal-toast";

const PAYMENT_TOAST_KEY = "payment-toast";

type PaymentFlashToast = {
  variant: "success" | "error";
  title: string;
  message: string;
};

export function setPaymentFlashToast(toast: PaymentFlashToast) {
  sessionStorage.setItem(PAYMENT_TOAST_KEY, JSON.stringify(toast));
}

export function usePaymentFlashToast() {
  useEffect(() => {
    const stored = sessionStorage.getItem(PAYMENT_TOAST_KEY);
    if (!stored) {
      return;
    }

    sessionStorage.removeItem(PAYMENT_TOAST_KEY);

    try {
      const toast = JSON.parse(stored) as PaymentFlashToast;
      if (toast.variant === "success") {
        terminalToast.success(toast.title, toast.message);
      } else {
        terminalToast.error(toast.title, toast.message);
      }
    } catch {
      // ignore malformed flash payload
    }
  }, []);
}
