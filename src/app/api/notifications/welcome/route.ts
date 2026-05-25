import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureWelcomeNotification } from "@/lib/notifications/welcome-notification";

export const dynamic = "force-dynamic";

/** Idempotent welcome notification for new (and legacy) users. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const created = await ensureWelcomeNotification(
    admin,
    user.id,
    profile?.display_name ?? profile?.full_name ?? null,
  );

  return NextResponse.json({ created });
}
