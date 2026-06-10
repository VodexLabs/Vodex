import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { filterGroupMessageBody } from "@/lib/community/group-message-filter";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { text?: string; parentMessageId?: string | null };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const filtered = filterGroupMessageBody(text);
  if (!filtered.ok) return NextResponse.json({ error: filtered.reason }, { status: 400 });

  const { data: member } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: inserted, error } = await supabase
    .from("group_messages" as never)
    .insert({
      group_id: groupId,
      user_id: user.id,
      body: text,
      parent_message_id: body.parentMessageId ?? null,
    } as never)
    .select("id, body, created_at, user_id, parent_message_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, message: inserted });
}
