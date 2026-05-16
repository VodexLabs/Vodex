import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  // Verify the user is authenticated before deleting
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // If a service-role key is available, use it to delete the user fully
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Delete profile rows first (cascade should handle most, but be explicit)
    await adminClient.from("profiles").delete().eq("id", user.id);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[delete-account] admin delete failed:", deleteError.message);
      return NextResponse.json({ error: "Failed to delete account. Please contact support." }, { status: 500 });
    }
  } else {
    // Without service role key, sign out only and return a note
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Account deletion requires server-side configuration. Please contact support to complete account deletion." },
      { status: 503 },
    );
  }

  // Sign out the session
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
