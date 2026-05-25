import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAuthUser, requireMutationProjectId, isNextResponse } from "@/lib/ids/api-mutation-guard";
import { findPlaceholderFindings } from "@/lib/publish/placeholder-findings";
import { repairPlaceholderContent } from "@/lib/publish/placeholder-repair";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await ctx.params;
  const projectId = requireMutationProjectId(rawId);
  if (isNextResponse(projectId)) return projectId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authUser = requireAuthUser(user);
  if (isNextResponse(authUser)) return authUser;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_name")
    .eq("id", projectId)
    .eq("owner_id", authUser.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createServiceRoleClient() ?? supabase;
  const { data: rows } = await admin
    .from("app_files")
    .select("path, content")
    .eq("project_id", projectId)
    .limit(500);

  const files = (rows ?? []).map((r) => ({ path: r.path, content: r.content ?? "" }));
  const findings = findPlaceholderFindings(files);
  if (findings.length === 0) {
    return NextResponse.json({ ok: true, patched: 0, findings: [] });
  }

  const appName = project.app_name?.trim() || project.name?.trim() || "Your app";
  const result = repairPlaceholderContent({ files, findings, appName });

  for (const patch of result.patched) {
    await admin
      .from("app_files")
      .update({ content: patch.content } as never)
      .eq("project_id", projectId)
      .eq("path", patch.path);
  }

  const remaining = findPlaceholderFindings(
    files.map((f) => {
      const p = result.patched.find((x) => x.path === f.path);
      return p ?? f;
    }),
  );

  return NextResponse.json({
    ok: true,
    patched: result.patched.length,
    safe: result.safe && remaining.length === 0,
    skipped: result.skipped,
    remainingFindings: remaining,
  });
}
