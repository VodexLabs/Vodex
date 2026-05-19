import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/types";

const publishPatchSchema = z.object({
  publish_ui: z.record(z.string(), z.unknown()),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * PATCH — store publish UI draft for the owner only (replaces `metadata.publish_ui`).
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = publishPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: row, error: selErr } = await supabase
    .from("projects")
    .select("id, owner_id, metadata")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (selErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prevMeta = isRecord(row.metadata) ? row.metadata : {};
  const nextMeta: Record<string, unknown> = {
    ...prevMeta,
    publish_ui: parsed.data.publish_ui,
  };

  const { error: upErr } = await supabase
    .from("projects")
    .update({ metadata: nextMeta as Json })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ metadata: nextMeta });
}
