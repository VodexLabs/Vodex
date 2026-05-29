import type { PaymentProviderAdapter } from "@/lib/generated-runtime/payments/payment-provider";

export const paddleAdapter: PaymentProviderAdapter = {
  async createCheckout() {
    throw new Error("Connect Paddle in Payments settings first");
  },
};
