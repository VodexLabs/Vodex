import type { PaymentProviderAdapter } from "@/lib/generated-runtime/payments/payment-provider";

export const lemonSqueezyAdapter: PaymentProviderAdapter = {
  async createCheckout() {
    throw new Error("Connect Lemon Squeezy in Payments settings first");
  },
};
