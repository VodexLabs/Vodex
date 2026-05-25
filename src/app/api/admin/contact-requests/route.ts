import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { logAdminAudit } from "@/lib/admin/audit-log";
import { retryContactRequestEmail } from "@/lib/contact/save-contact-request";
import { isEmailConfigured, RESEND_DNS_SENDING_GUIDANCE } from "@/lib/email/email-config";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "open", "read", "replied", "resolved", "archived"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  internal_note: z.string().max(4000).optional(),
});

export async function GET(req: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const reason = searchParams.get("reason");
  const source = searchParams.get("source");
  const priority = searchParams.get("priority");
  const projectId = searchParams.get("projectId");
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  const admin = createSupabaseAdmin();

  let query = admin
    .from("contact_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") query = query.eq("status", status);
  if (reason && reason !== "all") query = query.eq("reason", reason);
  if (source && source !== "all") query = query.eq("source", source);
  if (priority && priority !== "all") query = query.eq("priority" as never, priority);
  if (projectId) query = query.eq("project_id" as never, projectId);
  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,message.ilike.%${q}%,subject.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message, requests: [] }, { status: 200 });
  }

  return NextResponse.json({
    requests: data ?? [],
    limit,
    offset,
    emailConfigured: isEmailConfigured(),
    dnsGuidance: RESEND_DNS_SENDING_GUIDANCE,
  });
}

export async function PATCH(request: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;
  const { user } = gate;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: existing } = await admin.from("contact_requests").select("*").eq("id", parsed.data.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.priority) patch.priority = parsed.data.priority;
  if (parsed.data.assigned_to !== undefined) patch.assigned_to = parsed.data.assigned_to;
  if (parsed.data.internal_note) {
    const meta = typeof existing.metadata === "object" && existing.metadata ? existing.metadata : {};
    const notes = Array.isArray((meta as { internal_notes?: unknown }).internal_notes)
      ? (meta as { internal_notes: unknown[] }).internal_notes
      : [];
    patch.metadata = {
      ...meta,
      internal_notes: [...notes, { at: new Date().toISOString(), by: user.id, text: parsed.data.internal_note }],
    };
  }

  const { data, error } = await admin.from("contact_requests").update(patch as never).eq("id", parsed.data.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAudit(user, "contact_request_update", {
    metadata: { requestId: parsed.data.id, patch: parsed.data },
  });

  return NextResponse.json({ request: data });
}

export async function POST(request: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const body = z
    .object({ action: z.literal("retry_email"), id: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const result = await retryContactRequestEmail(body.data.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ request: result.request, emailStatus: result.emailStatus });
}
