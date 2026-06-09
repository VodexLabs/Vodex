import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notifyCommunityEvent } from "@/lib/community/community-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: parentReplyId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const { data: parent } = await supabase
    .from("discussion_replies")
    .select("id, discussion_id, user_id")
    .eq("id", parentReplyId)
    .maybeSingle();
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: inserted, error } = await (supabase as any)
    .from("discussion_replies")
    .insert({
      discussion_id: parent.discussion_id,
      user_id: user.id,
      body: text,
      parent_reply_id: parentReplyId,
    })
    .select("id, body, created_at, user_id, like_count, parent_reply_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: discussion } = await supabase
    .from("discussions")
    .select("reply_count, user_id, title")
    .eq("id", parent.discussion_id)
    .single();

  if (parent.user_id !== user.id) {
    const admin = createServiceRoleClient();
    if (admin) {
      await notifyCommunityEvent(admin, {
        userId: parent.user_id,
        kind: "comment_replied",
        title: "Reply to your comment",
        body: text.slice(0, 120),
        actionUrl: "/community",
        metadata: { reply_id: inserted.id, parent_reply_id: parentReplyId },
      });
    }
  }

  if (discussion?.user_id && discussion.user_id !== user.id && discussion.user_id !== parent.user_id) {
    const admin = createServiceRoleClient();
    if (admin) {
      await notifyCommunityEvent(admin, {
        userId: discussion.user_id,
        kind: "discussion_commented",
        title: "New reply on your post",
        body: text.slice(0, 120),
        actionUrl: "/community",
        metadata: { discussion_id: parent.discussion_id },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    reply: inserted,
    replyCount: discussion?.reply_count ?? null,
  });
}
