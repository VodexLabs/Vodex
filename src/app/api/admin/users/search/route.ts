import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/users/search?q= — owner-only, max 10 users */
export async function GET(req: Request) {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("profiles")
    .select("id, email, display_name, username, plan_id, avatar_url")
    .or(`email.ilike.%${q}%,display_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data ?? []).map(
    (row: {
      id: string;
      email?: string;
      display_name?: string;
      username?: string;
      plan_id?: string;
      avatar_url?: string;
    }) => ({
      id: row.id,
      email: row.email ?? "",
      displayName: row.display_name ?? row.username ?? row.email?.split("@")[0] ?? "User",
      username: row.username ?? null,
      planId: row.plan_id ?? "free",
      avatarUrl: row.avatar_url ?? null,
    }),
  );

  return NextResponse.json({ users, results: users });
}
