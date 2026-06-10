import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendGroupDeleteVerificationEmail } from "@/lib/email/send-group-delete-email";
import { getPublicSiteUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

const EXPIRES_MINUTES = 30;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: group } = await supabase.from("groups").select("id, name, creator_id").eq("id", groupId).maybeSingle();
  if (!group || group.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const salt = randomBytes(8).toString("hex");
  const tokenHash = createHash("sha256").update(`${groupId}:${user.id}:${otp}:${salt}`).digest("hex");
  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const { error } = await admin
    .from("groups")
    .update({
      delete_requested_at: new Date().toISOString(),
      delete_verification_token: `${tokenHash}:${salt}`,
      delete_verified_at: null,
    } as never)
    .eq("id", groupId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const origin = getPublicSiteUrl();
  const confirmUrl = `${origin}/community/groups/${groupId}?deleteConfirm=${encodeURIComponent(otp)}`;

  await sendGroupDeleteVerificationEmail({
    to: user.email,
    groupName: group.name,
    confirmUrl,
    otp,
    expiresMinutes: EXPIRES_MINUTES,
  });

  return NextResponse.json({ ok: true, message: "Verification email sent." });
}
