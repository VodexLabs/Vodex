import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notifyCommunityEvent } from "@/lib/community/community-notifications";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: discussionId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: discussion } = await supabase
    .from("discussions")
    .select("id, user_id, title, like_count")
    .eq("id", discussionId)
    .maybeSingle();
  if (!discussion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("discussion_likes").insert({
    user_id: user.id,
    discussion_id: discussionId,
  });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: refreshed } = await supabase
    .from("discussions")
    .select("like_count")
    .eq("id", discussionId)
    .single();

  if (discussion.user_id !== user.id) {
    const admin = createServiceRoleClient();
    if (admin) {
      await notifyCommunityEvent(admin, {
        userId: discussion.user_id,
        kind: "discussion_liked",
        title: "Your post was liked",
        body: `Someone liked "${discussion.title.slice(0, 80)}"`,
        actionUrl: "/community",
        metadata: { discussion_id: discussionId, liker_id: user.id },
      });
    }
  }

  return NextResponse.json({ ok: true, likeCount: refreshed?.like_count ?? discussion.like_count });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: discussionId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("discussion_likes")
    .delete()
    .eq("user_id", user.id)
    .eq("discussion_id", discussionId);

  const { data: refreshed } = await supabase
    .from("discussions")
    .select("like_count")
    .eq("id", discussionId)
    .single();

  return NextResponse.json({ ok: true, likeCount: refreshed?.like_count ?? 0 });
}
