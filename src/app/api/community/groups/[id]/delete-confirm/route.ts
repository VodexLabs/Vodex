import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function hashDeleteCode(groupId: string, userId: string, code: string, salt: string): string {
  return createHash("sha256").update(`${groupId}:${userId}:${code}:${salt}`).digest("hex");
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { code?: string };
  const code = body.code?.trim();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const { data: groupRaw } = await supabase
    .from("groups")
    .select("id, creator_id, delete_requested_at, delete_verification_token")
    .eq("id", groupId)
    .maybeSingle();

  const group = groupRaw as {
    id: string;
    creator_id: string | null;
    delete_requested_at: string | null;
    delete_verification_token: string | null;
  } | null;

  if (!group || group.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!group.delete_requested_at || !group.delete_verification_token) {
    return NextResponse.json({ error: "No delete request pending" }, { status: 400 });
  }

  const requestedAt = new Date(group.delete_requested_at).getTime();
  if (Date.now() - requestedAt > 30 * 60 * 1000) {
    return NextResponse.json({ error: "Verification expired — request a new email." }, { status: 400 });
  }

  const [storedHash, salt] = String(group.delete_verification_token).split(":");
  if (!storedHash || !salt) {
    return NextResponse.json({ error: "Invalid verification state" }, { status: 400 });
  }

  const computed = hashDeleteCode(groupId, user.id, code, salt);
  if (computed !== storedHash) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const { error: delErr } = await admin.from("groups").delete().eq("id", groupId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
