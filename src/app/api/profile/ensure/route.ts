import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { bootstrapProfileFromOAuth } from "@/lib/auth/profile-bootstrap";

/**
 * Ensures a `public.profiles` row exists for the signed-in user (service role).
 * Call from the client when the browser Supabase client returns no profile — e.g.
 * first load after signup or when PostgREST schema cache is stale.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await bootstrapProfileFromOAuth(user, null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bootstrap_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ profile: profile ?? null });
  } catch {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return NextResponse.json({ profile: profile ?? null });
  }
}
