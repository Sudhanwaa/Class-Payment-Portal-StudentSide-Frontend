import type { FeeLedger, PaymentOrder, Student } from "./types";

export const isDemoMode = process.env.NEXT_PUBLIC_PORTAL_DEMO !== "false";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const demoStudents: Student[] = [
  { id: "1", name: "Sudhanwa M Bokade", mobileLastFour: "8774", courseHint: "Guitar" },
  { id: "2", name: "Sudhanwa Raj Patil", mobileLastFour: "2148", courseHint: "Vocals" },
  { id: "3", name: "Riya Sharma", mobileLastFour: "5602", courseHint: "Piano" },
  { id: "4", name: "Arjun Mehta", mobileLastFour: "9031", courseHint: "Drums" },
];

const demoFees: FeeLedger[] = [
  {
    feeLedgerId: "33",
    billingMonth: "2026-08",
    course: "Guitar",
    totalDue: 1700,
    amountPaid: 500,
    outstandingAmount: 1200,
    status: "PARTIALLY_PAID",
  },
  {
    feeLedgerId: "34",
    billingMonth: "2026-09",
    course: "Guitar",
    totalDue: 1600,
    amountPaid: 0,
    outstandingAmount: 1600,
    status: "UNPAID",
  },
  {
    feeLedgerId: "35",
    billingMonth: "2026-10",
    course: "Music Theory",
    totalDue: 900,
    amountPaid: 0,
    outstandingAmount: 900,
    status: "UNPAID",
  },
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: T; message?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body ? body.message : undefined;
    throw new Error(message || "The request could not be completed.");
  }

  if (body && typeof body === "object" && "data" in body) return body.data as T;
  return body as T;
}

export const studentApi = {
  async validateSession(): Promise<{ authenticated: boolean; studentSelected: boolean }> {
    if (isDemoMode) {
      await wait(450);
      return { authenticated: false, studentSelected: false };
    }
    return request("/api/students/auth/session");
  },

  async authenticate(password: string): Promise<void> {
    if (isDemoMode) {
      await wait(850);
      if (password !== "sonic2026") throw new Error("INCORRECT_PASSWORD");
      return;
    }
    const endpoint = process.env.NEXT_PUBLIC_STUDENT_AUTH_ENDPOINT;
    if (!endpoint) throw new Error("AUTH_ENDPOINT_NOT_CONFIGURED");
    await request(endpoint, { method: "POST", body: JSON.stringify({ password }) });
  },

  async searchStudents(query: string, signal?: AbortSignal): Promise<Student[]> {
    if (isDemoMode) {
      await wait(550);
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const normalized = query.trim().toLowerCase();
      return demoStudents.filter((student) => student.name.toLowerCase().includes(normalized));
    }
    return request(`/api/students/portal/search?q=${encodeURIComponent(query)}`, { signal });
  },

  async selectStudent(studentId: string): Promise<void> {
    if (isDemoMode) {
      await wait(700);
      return;
    }
    await request("/api/students/portal/select", {
      method: "POST",
      body: JSON.stringify({ studentId }),
    });
  },

  async getFees(): Promise<{ fees: FeeLedger[]; totalOutstanding: number }> {
    if (isDemoMode) {
      await wait(750);
      return {
        fees: demoFees,
        totalOutstanding: demoFees.reduce((sum, fee) => sum + fee.outstandingAmount, 0),
      };
    }
    return request("/api/students/portal/fees");
  },

  async createPayment(feeLedgerIds: string[]): Promise<PaymentOrder> {
    if (isDemoMode) {
      await wait(900);
      const amount = demoFees
        .filter((fee) => feeLedgerIds.includes(fee.feeLedgerId))
        .reduce((sum, fee) => sum + fee.outstandingAmount, 0);
      return {
        paymentId: `demo_${Date.now()}`,
        razorpay: {
          keyId: "rzp_test_demo",
          orderId: `order_demo_${Date.now()}`,
          amount: amount * 100,
          currency: "INR",
        },
      };
    }
    return request("/api/payments/student/request", {
      method: "POST",
      body: JSON.stringify({ feeLedgerIds }),
    });
  },
};
