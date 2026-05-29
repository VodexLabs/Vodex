import type { PaymentProviderId, PaymentConnectionMode } from "@/lib/generated-app-payments/types";
import type { ProviderSecrets, CheckoutResult } from "@/lib/generated-app-payments/providers/stripe";
import { verifyStripeConfig, createStripeCheckout } from "@/lib/generated-app-payments/providers/stripe";
import { verifyPaddleConfig, createPaddleCheckout } from "@/lib/generated-app-payments/providers/paddle";
import {
  verifyLemonSqueezyConfig,
  createLemonSqueezyCheckout,
} from "@/lib/generated-app-payments/providers/lemon-squeezy";
import { verifyPaypalConfig, createPaypalCheckout } from "@/lib/generated-app-payments/providers/paypal";

export type { ProviderSecrets, CheckoutResult };

export async function verifyProviderConfig(
  provider: PaymentProviderId,
  secrets: ProviderSecrets,
  mode: PaymentConnectionMode,
): Promise<{ ok: boolean; message: string }> {
  switch (provider) {
    case "stripe":
      return verifyStripeConfig(secrets);
    case "paddle":
      return verifyPaddleConfig(secrets);
    case "lemon_squeezy":
      return verifyLemonSqueezyConfig(secrets);
    case "paypal":
      return verifyPaypalConfig(secrets, mode);
    case "revenuecat":
      return { ok: false, message: "Use Mobile Billing wizard for RevenueCat" };
    default:
      return { ok: false, message: "Unknown provider" };
  }
}

export async function createProviderTestCheckout(input: {
  provider: PaymentProviderId;
  secrets: ProviderSecrets;
  mode: PaymentConnectionMode;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  projectId?: string;
}): Promise<CheckoutResult> {
  switch (input.provider) {
    case "stripe":
      return createStripeCheckout({
        secrets: input.secrets,
        mode: input.mode,
        priceId: input.priceId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        customerEmail: input.customerEmail,
      });
    case "paddle":
      return createPaddleCheckout({
        secrets: input.secrets,
        mode: input.mode,
        priceId: input.priceId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        projectId: input.projectId,
      });
    case "lemon_squeezy":
      return createLemonSqueezyCheckout({
        secrets: input.secrets,
        mode: input.mode,
        variantId: input.priceId,
        successUrl: input.successUrl,
      });
    case "paypal":
      return createPaypalCheckout({
        secrets: input.secrets,
        mode: input.mode,
        returnUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
    default:
      return { url: null, error: "Provider does not support web checkout" };
  }
}
