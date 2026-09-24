export type RequestState = "idle" | "loading" | "success" | "error";

export interface Student {
  id: string;
  name: string;
  mobileLastFour: string;
  courseHint?: string;
}

export type FeeStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "WAIVED";

export interface FeeLedger {
  feeLedgerId: string;
  billingMonth: string;
  course: string;
  totalDue: number;
  amountPaid: number;
  outstandingAmount: number;
  status: FeeStatus;
}

export interface PaymentOrder {
  paymentId: string;
  razorpay: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentReceipt {
  paymentId: string;
  amount: number;
  transactionId?: string;
  paidAt?: string;
}

export type PaymentOutcome =
  | { kind: "success"; receipt: PaymentReceipt }
  | { kind: "failed"; message: string }
  | { kind: "cancelled" }
  | { kind: "network"; message: string }
  | { kind: "verifying"; paymentId: string };
