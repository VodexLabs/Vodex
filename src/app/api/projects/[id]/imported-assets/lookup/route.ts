import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Resolve imported ZIP / Ripo-style asset names to project media URLs. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const name = url.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ data: null, ok: false });

  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, filename, public_url, mime_type, size_bytes, tags")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);

  const lower = name.toLowerCase();
  const match =
    (assets ?? []).find((a) => a.filename.toLowerCase() === lower) ??
    (assets ?? []).find((a) => a.filename.toLowerCase().includes(lower)) ??
    (assets ?? []).find((a) =>
      Array.isArray(a.tags) ? a.tags.some((t) => String(t).toLowerCase().includes(lower)) : false,
    );

  if (!match) {
    return NextResponse.json({ data: null, items: [], ok: true });
  }

  return NextResponse.json({
    data: match,
    items: [match],
    ok: true,
    url: match.public_url,
    public_url: match.public_url,
  });
}
