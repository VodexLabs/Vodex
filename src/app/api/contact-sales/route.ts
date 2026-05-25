import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createContactRequest } from "@/lib/contact/save-contact-request";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  kind: z.enum(["sales", "support"]),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional().nullable(),
  team_size: z.string().max(120).optional().nullable(),
  expected_usage: z.string().max(500).optional().nullable(),
  current_plan: z.string().max(120).optional().nullable(),
  message: z.string().min(1).max(8000),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`contact-sales:${ip}`, 6, 15 * 60_000);
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
    source: parsed.data.kind === "sales" ? "sales" : "support",
    kind: parsed.data.kind,
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim(),
    company: parsed.data.company?.trim() || null,
    message: parsed.data.message.trim(),
    reason: parsed.data.kind === "sales" ? "Sales" : "Support",
    subject: parsed.data.kind === "sales" ? "Sales inquiry" : "Support request",
    plan_interest: parsed.data.current_plan?.trim() || null,
    isPlatformContact: true,
    metadata: {
      form: "pricing_modal",
      team_size: parsed.data.team_size?.trim() || null,
      expected_usage: parsed.data.expected_usage?.trim() || null,
      current_plan: parsed.data.current_plan?.trim() || null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, hint: "Apply the contact_requests migration if this table is missing." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, id: result.request.id, emailStatus: result.emailStatus });
}
