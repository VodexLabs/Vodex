import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/**
 * Returns whether an account is registered for this email (for login UX only).
 * Does not expose user ids or secrets.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ registered: false });
  }

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profile?.id) {
      return NextResponse.json({ registered: true });
    }

    const { data: profileIlike } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    return NextResponse.json({ registered: Boolean(profileIlike?.id) });
  } catch {
    return NextResponse.json({ registered: false });
  }
}
