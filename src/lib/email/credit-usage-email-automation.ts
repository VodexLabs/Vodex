import { createServiceRoleClient } from "@/lib/supabase/admin";
import { loadCanonicalCredits } from "@/lib/credits/canonical-credits";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import { getAppUrl } from "@/lib/app-url";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { escapeHtmlText } from "@/lib/control-center/sanitize-url";

export type CreditAutomationKey =
  | "build_credits_80"
  | "build_credits_100"
  | "action_credits_80"
  | "action_credits_100";

function usagePercent(used: number, allowance: number): number {
  if (allowance <= 0) return 0;
  return Math.min(100, Math.round((used / allowance) * 100));
}

function cycleKeyFromReset(resetAt: string | null | undefined): string {
  if (!resetAt) return `month-${new Date().toISOString().slice(0, 7)}`;
  return resetAt.slice(0, 10);
}

function creditLowHtml(opts: {
  appUrl: string;
  name?: string;
  creditLabel: string;
  exhausted: boolean;
}): string {
  const title = opts.exhausted
    ? `${opts.creditLabel} exhausted`
    : `${opts.creditLabel} running low`;
  const body = opts.exhausted
    ? `<p>You've used all of your <strong>${escapeHtmlText(opts.creditLabel)}</strong> for this billing period. Upgrade for more capacity, or wait for your plan reset — your projects stay saved.</p>`
    : `<p>You've used about 80% of your <strong>${escapeHtmlText(opts.creditLabel)}</strong> this period. Upgrade now to avoid interruptions mid-build.</p>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:system-ui,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:linear-gradient(180deg,#e0f2fe,#f8fafc);">
<tr><td align="center"><table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(14,116,244,0.12);">
<tr><td style="padding:28px 32px 8px;background:linear-gradient(135deg,#0ea5e9,#6366f1);"><span style="font-size:22px;font-weight:800;color:#fff;">Vodex</span></td></tr>
<tr><td style="padding:24px 32px;font-size:15px;line-height:1.6;"><p>Hi${opts.name ? ` ${escapeHtmlText(opts.name)}` : ""},</p>
<h2 style="margin:0 0 12px;font-size:18px;">${escapeHtmlText(title)}</h2>${body}
<p style="margin:24px 0;"><a href="${opts.appUrl}/pricing" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">Upgrade plan</a></p>
<p style="font-size:13px;color:#64748b;"><a href="${opts.appUrl}/settings/billing">Manage billing</a> · <a href="${opts.appUrl}/settings/notifications">Email preferences</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

async function alreadySent(
  db: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  key: CreditAutomationKey,
  cycleKey: string,
): Promise<boolean> {
  if (!db) return true;
  const { data } = await db
    .from("email_automation_events" as never)
    .select("id")
    .eq("user_id" as never, userId)
    .eq("automation_key" as never, key)
    .eq("cycle_key" as never, cycleKey)
    .maybeSingle();
  return Boolean(data);
}

async function recordSent(
  db: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  key: CreditAutomationKey,
  creditType: "build" | "action",
  threshold: 80 | 100,
  cycleKey: string,
) {
  await db.from("email_automation_events" as never).insert({
    user_id: userId,
    automation_key: key,
    credit_type: creditType,
    threshold,
    cycle_key: cycleKey,
  } as never);
}

/**
 * Sends credit-low emails + in-app notifications once per cycle per threshold.
 */
export async function maybeSendCreditUsageEmails(
  userId: string,
  creditType: "build" | "action",
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, plan_id, credits_reset_at, marketing_emails_opt_in")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email) return;

  const credits = await loadCanonicalCredits({
    userId,
    planId: profile.plan_id,
    email: profile.email,
    creditsResetAt: profile.credits_reset_at,
    skipLedger: true,
  });

  const bucket = creditType === "build" ? credits.build : credits.action;
  const usedPct = usagePercent(bucket.usedThisPeriod, bucket.planAllowance + bucket.bonusActive);
  const cycleKey = cycleKeyFromReset(profile.credits_reset_at);
  const appUrl = getAppUrl().replace(/\/$/, "");
  const name = profile.full_name?.split(/\s+/)[0];
  const creditLabel = creditType === "build" ? "Build Credits" : "Action Credits";

  const thresholds: Array<{ pct: number; key: CreditAutomationKey; threshold: 80 | 100 }> = [
    { pct: 80, key: creditType === "build" ? "build_credits_80" : "action_credits_80", threshold: 80 },
    { pct: 100, key: creditType === "build" ? "build_credits_100" : "action_credits_100", threshold: 100 },
  ];

  for (const t of thresholds) {
    if (usedPct < t.pct) continue;
    if (await alreadySent(admin, userId, t.key, cycleKey)) continue;

    const exhausted = t.threshold === 100;
    await createUserNotification(admin, {
      userId,
      kind: "credits_low",
      title: exhausted ? `${creditLabel} exhausted` : `${creditLabel} running low`,
      body: exhausted
        ? "Upgrade for more capacity or wait for your plan reset."
        : "You've used about 80% of your credits this period.",
      actionUrl: "/pricing",
      iconKey: "credit",
      metadata: { credit_type: creditType, threshold: t.threshold },
    });

    if (profile.marketing_emails_opt_in) {
      await sendResendEmail({
        to: profile.email,
        subject: exhausted
          ? `Your ${creditLabel} are exhausted`
          : `Your ${creditLabel} are running low`,
        text: exhausted ? `${creditLabel} exhausted` : `${creditLabel} at 80%`,
        html: creditLowHtml({ appUrl, name, creditLabel, exhausted }),
        devConsoleFallback: true,
        devLabel: "credit-automation",
      });
    }

    await recordSent(admin, userId, t.key, creditType, t.threshold, cycleKey);
  }
}

/** Call after a successful credit charge (build or action bucket). */
export async function maybeSendCreditUsageEmailsAfterCharge(
  userId: string,
  mode: string,
  operationType?: string,
): Promise<void> {
  const atomic =
    mode === "image" ||
    mode === "email" ||
    mode === "speech" ||
    mode === "video" ||
    mode === "upload" ||
    mode === "action" ||
    mode === "app_logo_generation" ||
    Boolean(operationType);
  const creditType = atomic ? "action" : "build";
  try {
    await maybeSendCreditUsageEmails(userId, creditType);
  } catch {
    /* best-effort */
  }
}
