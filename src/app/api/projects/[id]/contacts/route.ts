import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { retryContactRequestEmail } from "@/lib/contact/save-contact-request";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "open", "read", "replied", "resolved", "archived"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  internal_note: z.string().max(4000).optional(),
});

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

  const admin = createSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.owner_id !== user.id && !isDreamosOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("contact_requests")
    .select("*")
    .eq("project_id" as never, projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.owner_id !== user.id && !isDreamosOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await admin
    .from("contact_requests")
    .select("*")
    .eq("id", parsed.data.id)
    .eq("project_id" as never, projectId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.priority) patch.priority = parsed.data.priority;
  if (parsed.data.internal_note) {
    const notes = Array.isArray((existing.metadata as { internal_notes?: unknown }).internal_notes)
      ? ((existing.metadata as { internal_notes: unknown[] }).internal_notes)
      : [];
    patch.metadata = {
      ...(typeof existing.metadata === "object" && existing.metadata ? existing.metadata : {}),
      internal_notes: [...notes, { at: new Date().toISOString(), by: user.id, text: parsed.data.internal_note }],
    };
  }

  const { data, error } = await admin.from("contact_requests").update(patch as never).eq("id", parsed.data.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z
    .object({ action: z.literal("retry_email"), id: z.string().uuid(), requestId: z.string().uuid().optional() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const requestId = body.data.id ?? body.data.requestId!;

  const admin = createSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.owner_id !== user.id && !isDreamosOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await admin
    .from("contact_requests")
    .select("id")
    .eq("id", requestId)
    .eq("project_id" as never, projectId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const result = await retryContactRequestEmail(requestId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ request: result.request, emailStatus: result.emailStatus });
}
