import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const { data, error } = await admin
    .from("email_campaigns" as never)
    .select("id, template_id, subject, target_scope, target_plan, target_email, recipient_count, status, sent_at")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}
