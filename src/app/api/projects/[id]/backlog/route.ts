import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireProjectId, jsonMissingId, jsonNotFound, jsonUnauthorized } from "@/lib/ids/required-ids";
import { loadBuildBacklog, estimateContinuationCredits } from "@/lib/build/build-backlog";
import type { BacklogCategory } from "@/lib/build/build-backlog";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await ctx.params;
  const projectId = requireProjectId(rawId);
  if (!projectId) return jsonMissingId("projectId", "Project id is required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonUnauthorized();

  const writer = createServiceRoleClient() ?? supabase;
  const { data: project } = await writer
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return jsonNotFound();

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as BacklogCategory | null;
  const items = await loadBuildBacklog(writer, projectId, category ? { category } : undefined);
  const estimatedNextPassCredits = estimateContinuationCredits(items.slice(0, 5));

  return NextResponse.json({
    items,
    queuedCount: items.filter((i) => i.status === "queued").length,
    estimatedNextPassCredits,
  });
}
