import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createContactRequest } from "@/lib/contact/save-contact-request";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

const REASONS = [
  "Sales",
  "Support",
  "Billing",
  "Partnership",
  "Product feedback",
  "Other",
] as const;

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional().nullable(),
  reason: z.enum(REASONS),
  message: z.string().min(1).max(8000),
  plan_interest: z.string().max(120).optional().nullable(),
});

function reasonToKind(reason: (typeof REASONS)[number]): "sales" | "support" {
  if (reason === "Sales" || reason === "Partnership") return "sales";
  return "support";
}

function reasonToSource(reason: (typeof REASONS)[number]): string {
  if (reason === "Sales") return "sales";
  if (reason === "Billing") return "billing";
  if (reason === "Support") return "support";
  return "platform_contact";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`contact:${ip}`, 6, 15 * 60_000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await createContactRequest({
    user_id: user?.id ?? null,
    source: reasonToSource(parsed.data.reason),
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim(),
    company: parsed.data.company?.trim() || null,
    kind: reasonToKind(parsed.data.reason),
    message: parsed.data.message.trim(),
    reason: parsed.data.reason,
    subject: parsed.data.reason,
    plan_interest: parsed.data.plan_interest?.trim() || null,
    isPlatformContact: true,
    metadata: { form: "contact_page" },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        hint: "Apply supabase/migrations/20260626120000_contact_center_action_credits.sql if columns are missing.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    id: result.request.id,
    emailStatus: result.emailStatus,
  });
}
