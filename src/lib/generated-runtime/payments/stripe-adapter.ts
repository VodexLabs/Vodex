import type { PaymentProviderAdapter } from "@/lib/generated-runtime/payments/payment-provider";

export const stripeAdapter: PaymentProviderAdapter = {
  async createCheckout() {
    throw new Error("Connect Stripe in Payments settings first");
  },
  async getCustomerPortalUrl() {
    return null;
  },
};
