import type { PaymentProviderAdapter } from "@/lib/generated-runtime/payments/payment-provider";

export const paypalAdapter: PaymentProviderAdapter = {
  async createCheckout() {
    throw new Error("Connect PayPal in Payments settings first");
  },
};
