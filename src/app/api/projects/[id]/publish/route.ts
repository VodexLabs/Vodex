import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { allocatePublishedSubdomain, publicWebUrlForSubdomain } from "@/lib/publish/subdomain";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Publish metadata: public subdomain URL, plan gates, etc.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("plan_id").eq("id", user.id).maybeSingle();
  const planId = prof?.plan_id ?? "free";

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, slug, name, published_subdomain, custom_domain, metadata")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sub = (project as { published_subdomain?: string | null }).published_subdomain?.trim() ?? null;
  const publicWebUrl = sub ? publicWebUrlForSubdomain(sub) : null;

  const p = (planId ?? "free").toLowerCase();
  const customDomainAllowed = p === "pro" || p === "business" || p === "enterprise";

  return NextResponse.json({
    projectId,
    planId,
    subdomain: sub,
    publicWebUrl,
    customDomain: project.custom_domain ?? null,
    customDomainAllowed,
    platformBaseDomain: "dreamos86.com",
  });
}

/**
 * Ensure a unique subdomain is allocated and returned (idempotent if already set).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const admin = createServiceRoleClient() ?? supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, published_subdomain")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allocated = await allocatePublishedSubdomain(admin, projectId, user.id);
  if (!allocated) {
    return NextResponse.json(
      { error: "Could not allocate subdomain (database or uniqueness conflict)." },
      { status: 500 },
    );
  }

  const publicWebUrl = publicWebUrlForSubdomain(allocated);
  const iconUrl = `${getAppUrl().replace(/\/$/, "")}/api/projects/${projectId}/icon`;

  await admin
    .from("projects")
    .update({ icon_url: iconUrl } as never)
    .eq("id", projectId)
    .eq("owner_id", user.id);

  return NextResponse.json({
    subdomain: allocated,
    publicWebUrl,
    iconUrl,
  });
}
