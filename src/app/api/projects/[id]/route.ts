import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/types";

const publishPatchSchema = z.object({
  publish_ui: z.record(z.string(), z.unknown()).optional(),
  app_name: z.string().min(1).max(80).optional(),
  short_description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
}).refine(
  (d) =>
    d.publish_ui != null ||
    d.app_name != null ||
    d.short_description != null ||
    d.is_public != null ||
    d.is_favorite != null,
  { message: "No fields to update" },
);

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
  const nextMeta: Record<string, unknown> = { ...prevMeta };
  const update: Record<string, unknown> = {};

  if (parsed.data.publish_ui != null) {
    nextMeta.publish_ui = parsed.data.publish_ui;
    update.metadata = nextMeta as Json;
  }
  if (parsed.data.app_name != null) {
    update.app_name = parsed.data.app_name.trim();
    update.name = parsed.data.app_name.trim();
  }
  if (parsed.data.short_description != null) {
    update.short_description = parsed.data.short_description.trim();
    nextMeta.short_description = parsed.data.short_description.trim();
    update.metadata = nextMeta as Json;
  }
  if (parsed.data.is_public != null) {
    update.is_public = parsed.data.is_public;
  }
  if (parsed.data.is_favorite != null) {
    update.is_favorite = parsed.data.is_favorite;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error: upErr } = await supabase
    .from("projects")
    .update(update as never)
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    metadata: nextMeta,
    is_favorite: parsed.data.is_favorite ?? undefined,
  });
}
