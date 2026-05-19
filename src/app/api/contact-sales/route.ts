import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

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

  const row: Database["public"]["Tables"]["contact_requests"]["Insert"] = {
    user_id: user?.id ?? null,
    kind: parsed.data.kind,
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim(),
    company: parsed.data.company?.trim() || null,
    team_size: parsed.data.team_size?.trim() || null,
    expected_usage: parsed.data.expected_usage?.trim() || null,
    current_plan: parsed.data.current_plan?.trim() || null,
    message: parsed.data.message.trim(),
  };

  const { error } = await admin.from("contact_requests").insert(row);
  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Apply the contact_requests migration if this table is missing." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
