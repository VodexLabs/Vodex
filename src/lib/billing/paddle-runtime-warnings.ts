import { paddleEnvironment } from "@/lib/billing/paddle-billing";
import { getAppUrl } from "@/lib/app-url";
import { validateSupabaseProjectConsistency } from "@/lib/supabase/supabase-project-consistency";
import { PRODUCTION_CANONICAL_PROJECT_REF } from "@/lib/supabase/supabase-project-config";
import { validatePaddleEnvironmentConsistency } from "@/lib/billing/paddle-env-consistency";
import { missingPaddleEnvVars } from "@/lib/billing/paddle-billing";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function logPaddleRuntimeWarnings(): void {
  const warnings: string[] = [];
  const errors: string[] = [];

  const paddleEnv = paddleEnvironment();
  const appUrl = getAppUrl();

  let hostname = "";
  try {
    hostname = new URL(appUrl).hostname.toLowerCase();
  } catch {
    hostname = "";
  }

  const isLocalApp = LOCAL_HOSTS.has(hostname) || hostname.endsWith(".local");

  if (paddleEnv === "production" && isLocalApp) {
    errors.push(
      "PRODUCTION PADDLE + LOCALHOST: Production Paddle webhooks are delivered to https://dreamos86.com/api/webhooks/paddle — NOT localhost. " +
        "Plan/credits will NOT update locally unless NEXT_PUBLIC_SUPABASE_URL points at the same project production webhooks write to, or you tunnel webhooks to localhost (ngrok).",
    );
  }

  const paddleConsistency = validatePaddleEnvironmentConsistency();
  if (!paddleConsistency.ok) {
    errors.push(...paddleConsistency.errors);
  }
  warnings.push(...paddleConsistency.warnings);

  const missing = missingPaddleEnvVars();
  if (missing.length > 0) {
    warnings.push(`Missing Paddle env: ${missing.join(", ")}`);
  }

  const supabaseConsistency = validateSupabaseProjectConsistency();
  if (!supabaseConsistency.ok) {
    errors.push(...supabaseConsistency.errors);
  }
  if (
    paddleEnv === "production" &&
    isLocalApp &&
    supabaseConsistency.urlProjectRef &&
    supabaseConsistency.urlProjectRef !== PRODUCTION_CANONICAL_PROJECT_REF
  ) {
    errors.push(
      `Supabase project ref (${supabaseConsistency.urlProjectRef}) differs from production canonical (${PRODUCTION_CANONICAL_PROJECT_REF}). ` +
        "Production Paddle webhooks update production DB; this local app reads a different project.",
    );
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/paddle`;
  if (paddleEnv === "production" && !webhookUrl.includes("dreamos86.com") && !isLocalApp) {
    warnings.push(
      `Webhook URL derived from app origin (${webhookUrl}) — Paddle Dashboard should use https://dreamos86.com/api/webhooks/paddle in production.`,
    );
  }

  for (const e of errors) {
    console.error("[DreamOS86][paddle-billing] ⚠️", e);
  }
  for (const w of warnings) {
    console.warn("[DreamOS86][paddle-billing]", w);
  }
}
