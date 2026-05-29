import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import { getDecryptedSecrets } from "@/lib/generated-app-payments/connection-store";
import { listPaymentConnections } from "@/lib/generated-app-payments/connection-store";
import { verifyProviderConfig } from "@/lib/generated-app-payments/providers/index";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type VerifyProviderResult =
  | { ok: true; message: string; status: "verified" | "webhook_missing" }
  | { ok: false; message: string; status: "error" };

export async function verifyPaymentProviderConfig(
  projectId: string,
  provider: PaymentProviderId,
): Promise<VerifyProviderResult> {
  const secrets = await getDecryptedSecrets(projectId, provider);
  const rows = await listPaymentConnections(projectId);
  const row = rows.find((r) => r.provider === provider);
  const mode = row?.mode ?? "test";

  const result = await verifyProviderConfig(provider, secrets, mode);
  if (!result.ok) {
    return { ok: false, message: result.message, status: "error" };
  }

  const hasWebhook = Boolean(secrets.webhook_secret?.trim());
  const status = hasWebhook ? "verified" : "webhook_missing";

  const admin = createServiceRoleClient();
  if (admin) {
    await admin
      .from("payment_provider_connections" as never)
      .update({
        status,
        last_verified_at: new Date().toISOString(),
        last_error: hasWebhook ? null : "Add webhook secret to mark webhooks verified",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("project_id", projectId)
      .eq("provider", provider);
  }

  return {
    ok: true,
    message: hasWebhook
      ? result.message
      : `${result.message} — save a webhook secret to enable webhook verification.`,
    status,
  };
}
