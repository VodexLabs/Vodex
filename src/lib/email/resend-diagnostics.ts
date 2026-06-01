import { getEmailConfig } from "@/lib/email/email-config";

export type ResendDiagnostics = {
  resendApiKeyPresent: boolean;
  emailFromPresent: boolean;
  emailFromValid: boolean;
  configured: boolean;
  runtime: string;
  vercelEnv: string | null;
  message: string | null;
};

const EMAIL_FROM_RE = /^.+<[^@\s]+@[^@\s]+\.[^@\s]+>$/;

export function getResendDiagnostics(): ResendDiagnostics {
  const cfg = getEmailConfig();
  const resendApiKeyPresent = Boolean(cfg.resendApiKey);
  const emailFromPresent = Boolean(
    process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim(),
  );
  const emailFromValid = EMAIL_FROM_RE.test(cfg.from);

  let message: string | null = null;
  if (!resendApiKeyPresent) {
    message = "RESEND_API_KEY is not set in this server runtime.";
  } else if (!emailFromPresent) {
    message = "RESEND_API_KEY is set but EMAIL_FROM is missing.";
  } else if (!emailFromValid) {
    message = 'EMAIL_FROM must look like: Vodex <support@vodex.dev>';
  }

  return {
    resendApiKeyPresent,
    emailFromPresent,
    emailFromValid,
    configured: resendApiKeyPresent && emailFromPresent && emailFromValid,
    runtime: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? null,
    message,
  };
}
