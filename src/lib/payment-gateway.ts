import type { PaymentOrder, PaymentOutcome } from "./types";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: () => void;
  modal: { ondismiss: () => void; escape: boolean };
  theme: { color: string };
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("CHECKOUT_UNAVAILABLE")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("CHECKOUT_UNAVAILABLE"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  order: PaymentOrder,
  schoolName: string,
  description: string,
  brandColor: string,
): Promise<PaymentOutcome> {
  try {
    await loadRazorpay();
  } catch {
    return {
      kind: "network",
      message: "We could not open the secure checkout. Check your connection and try again.",
    };
  }

  return new Promise((resolve) => {
    if (!window.Razorpay) {
      resolve({ kind: "network", message: "Secure checkout is temporarily unavailable." });
      return;
    }
    let handled = false;
    const checkout = new window.Razorpay({
      key: order.razorpay.keyId,
      order_id: order.razorpay.orderId,
      amount: order.razorpay.amount,
      currency: order.razorpay.currency,
      name: schoolName,
      description,
      theme: { color: brandColor },
      handler: () => {
        handled = true;
        // A Razorpay callback is not proof of payment. Keep this pending until the
        // backend session reports the verified result.
        resolve({ kind: "verifying", paymentId: order.paymentId });
      },
      modal: {
        escape: true,
        ondismiss: () => {
          if (!handled) resolve({ kind: "cancelled" });
        },
      },
    });
    checkout.open();
  });
}
