import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createContactRequest } from "@/lib/contact/save-contact-request";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  projectId: z.string().uuid().optional(),
  appSlug: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  subject: z.string().max(300).optional().nullable(),
  message: z.string().min(1).max(8000),
}).refine((v) => v.projectId || v.appSlug, { message: "projectId or appSlug required" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`runtime-contact:${ip}`, 8, 15 * 60_000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  let projectQuery = admin.from("projects").select("id, name, slug, owner_id");
  if (parsed.data.projectId) {
    projectQuery = projectQuery.eq("id", parsed.data.projectId);
  } else {
    projectQuery = projectQuery.eq("slug", parsed.data.appSlug!);
  }

  const { data: project, error: projectError } = await projectQuery.maybeSingle();
  if (projectError || !project) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const { data: ownerAuth } = await admin.auth.admin.getUserById(project.owner_id);
  const ownerEmail = ownerAuth?.user?.email ?? null;

  const result = await createContactRequest({
    source: "generated_app_contact",
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim(),
    subject: parsed.data.subject?.trim() || "Contact from app visitor",
    message: parsed.data.message.trim(),
    project_id: project.id,
    app_slug: project.slug,
    owner_user_id: project.owner_id,
    ownerUserEmail: ownerEmail,
    projectName: project.name,
    meterEmailToOwner: true,
    metadata: { runtime: true, page: request.headers.get("referer") ?? null },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    id: result.request.id,
    emailStatus: result.emailStatus,
  });
}
