import type { PaymentProviderId } from "@/lib/generated-app-payments/types";

export type CheckoutInput = {
  projectId: string;
  provider: PaymentProviderId;
  productId: string;
  priceId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
};

export type PaymentProviderAdapter = {
  createCheckout(input: CheckoutInput): Promise<{ url: string | null; sessionId?: string }>;
  getCustomerPortalUrl?(input: { projectId: string; customerId: string }): Promise<string | null>;
};
