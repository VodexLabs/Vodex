import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const row = {
    user_id: user?.id ?? null,
    kind: reasonToKind(parsed.data.reason),
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim(),
    company: parsed.data.company?.trim() || null,
    team_size: null,
    expected_usage: null,
    current_plan: null,
    message: parsed.data.message.trim(),
    reason: parsed.data.reason,
    plan_interest: parsed.data.plan_interest?.trim() || null,
    status: "new",
    source: "contact_page",
    metadata: {} as Json,
  } satisfies Database["public"]["Tables"]["contact_requests"]["Insert"];

  const { error } = await admin.from("contact_requests").insert(row);
  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Apply supabase/migrations/20260520200000_contact_requests_expand.sql if columns are missing.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
