import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notifyCommunityEvent } from "@/lib/community/community-notifications";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: replyId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: reply } = await supabase
    .from("discussion_replies")
    .select("id, user_id, body, like_count")
    .eq("id", replyId)
    .maybeSingle();
  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("discussion_reply_likes" as never).insert({
    user_id: user.id,
    reply_id: replyId,
  } as never);
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: refreshed } = await supabase
    .from("discussion_replies")
    .select("like_count")
    .eq("id", replyId)
    .single();

  if (reply.user_id !== user.id) {
    const admin = createServiceRoleClient();
    if (admin) {
      await notifyCommunityEvent(admin, {
        userId: reply.user_id,
        kind: "comment_liked",
        title: "Your comment was liked",
        body: reply.body.slice(0, 100),
        actionUrl: "/community",
        metadata: { reply_id: replyId },
      });
    }
  }

  return NextResponse.json({ ok: true, likeCount: refreshed?.like_count ?? reply.like_count });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: replyId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("discussion_reply_likes" as never)
    .delete()
    .eq("user_id", user.id)
    .eq("reply_id", replyId);

  const { data: refreshed } = await supabase
    .from("discussion_replies")
    .select("like_count")
    .eq("id", replyId)
    .single();

  return NextResponse.json({ ok: true, likeCount: refreshed?.like_count ?? 0 });
}
