import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import { getEmailConfig } from "@/lib/email/email-config";
import { MARKETING_EMAIL_TEMPLATES } from "@/lib/email/marketing-email-templates";
import { getAppUrl } from "@/lib/app-url";
import { searchMarketingRecipients } from "@/lib/admin/search-marketing-recipients";

type TargetPlan = "all_opted_in" | "free" | "starter" | "pro" | "infinity";

export async function POST(req: Request) {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const body = (await req.json()) as {
    templateId?: string;
    targetPlan?: TargetPlan;
    targetEmail?: string;
    testOnly?: boolean;
  };

  const template = MARKETING_EMAIL_TEMPLATES.find((t) => t.id === body.templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  const cfg = getEmailConfig();
  if (!cfg.resendApiKey) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY is not configured on the server. Add RESEND_API_KEY and EMAIL_FROM to .env.local, then restart.",
        code: "email_not_configured",
      },
      { status: 503 },
    );
  }
  if (!cfg.from?.trim()) {
    return NextResponse.json(
      {
        error: "EMAIL_FROM is not configured on the server.",
        code: "email_from_missing",
      },
      { status: 503 },
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const appUrl = getAppUrl().replace(/\/$/, "");

  let recipients: Array<{ id: string; email: string; full_name?: string | null }> = [];

  if (body.testOnly) {
    const testEmail = body.targetEmail?.trim().toLowerCase();
    if (!testEmail) {
      return NextResponse.json({ error: "Test recipient email is required" }, { status: 400 });
    }
    const found = await searchMarketingRecipients(testEmail, 1);
    const match = found.results.find((r) => r.email.toLowerCase() === testEmail);
    recipients = [
      {
        id: match?.id ?? owner.user.id,
        email: testEmail,
        full_name: match?.displayName ?? null,
      },
    ];
  } else if (body.targetEmail?.trim()) {
    const normalized = body.targetEmail.trim().toLowerCase();
    const { data: profile } = await db
      .from("profiles")
      .select("id, email, full_name, marketing_emails_opt_in")
      .eq("email", normalized)
      .maybeSingle();
    if (!profile?.email) {
      return NextResponse.json({ error: "User not found for that email" }, { status: 404 });
    }
    if (!profile.marketing_emails_opt_in) {
      return NextResponse.json(
        {
          error: "User opted out of marketing emails",
          skipped: 1,
          sent: 0,
          attempted: 1,
        },
        { status: 400 },
      );
    }
    recipients = [profile];
  } else {
    const { data: rows, error: listErr } = await db
      .from("profiles")
      .select("id, email, full_name, plan_id, marketing_emails_opt_in")
      .eq("marketing_emails_opt_in", true)
      .limit(5000);
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }
    const target = body.targetPlan ?? "all_opted_in";
    recipients = (rows ?? []).filter((p: { plan_id?: string }) => {
      if (target === "all_opted_in") return true;
      const plan = (p.plan_id ?? "free").toLowerCase();
      if (target === "free") return plan === "free";
      if (target === "starter") return plan === "starter";
      if (target === "pro") return plan === "pro";
      if (target === "infinity") return plan.startsWith("infinity") || plan === "enterprise";
      return true;
    });
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No opted-in recipients match this audience", sent: 0, skipped: 0, attempted: 0 },
      { status: 400 },
    );
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    const unsubscribeUrl = `${appUrl}/settings/notifications`;
    const html = template.buildHtml({
      appUrl,
      unsubscribeUrl,
      name: r.full_name?.split(/\s+/)[0] ?? undefined,
    });
    const result = await sendResendEmail({
      to: r.email,
      subject: template.subject,
      text: template.preheader,
      html,
      devConsoleFallback: false,
      devLabel: "marketing",
    });
    if (result.deliveredToInbox) {
      sent += 1;
    } else {
      skipped += 1;
      if (result.error) errors.push(`${r.email}: ${result.error}`);
      else errors.push(`${r.email}: ${result.message}`);
    }
  }

  if (!body.testOnly) {
    const { error: historyErr } = await db.from("email_campaigns").insert({
      template_id: template.id,
      subject: template.subject,
      target_scope: body.targetEmail ? "single" : body.targetPlan ?? "all_opted_in",
      target_email: body.targetEmail ?? null,
      recipient_count: sent,
      status: sent > 0 ? "sent" : "failed",
      created_by: owner.user.id,
    });
    if (historyErr) {
      console.warn("[email-marketing] campaign history insert failed:", historyErr.message);
    }
  }

  if (sent === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: errors[0] ?? "No emails were delivered",
        sent,
        skipped,
        attempted: recipients.length,
        errors: errors.slice(0, 5),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    attempted: recipients.length,
    errors: errors.slice(0, 5),
    testOnly: Boolean(body.testOnly),
  });
}
