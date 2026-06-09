import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notifyCommunityEvent } from "@/lib/community/community-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { userId?: string };
  const targetId = body.userId?.trim();
  if (!targetId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (targetId === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (admin as any)
    .from("profiles")
    .select("id, allow_follows, display_name, username")
    .eq("id", targetId)
    .maybeSingle();
  if (!target?.allow_follows) {
    return NextResponse.json({ error: "User does not accept follows" }, { status: 403 });
  }

  const { error } = await (admin as any).from("user_follows").insert({
    follower_id: user.id,
    following_id: targetId,
  });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const followerName =
    (await admin.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle())
      .data?.display_name ??
    user.email?.split("@")[0] ??
    "Someone";

  await notifyCommunityEvent(admin, {
    userId: targetId,
    kind: "user_followed",
    title: "New follower",
    body: `${followerName} started following you.`,
    actionUrl: `/builders/${target.username ?? targetId}`,
    metadata: { follower_id: user.id },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetId = url.searchParams.get("userId");
  if (!targetId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await (supabase as any).from("user_follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
  return NextResponse.json({ ok: true });
}
