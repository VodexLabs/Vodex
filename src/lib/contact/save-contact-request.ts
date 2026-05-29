import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { sendContactNotificationEmail } from "@/lib/contact/contact-email";
import type {
  ContactEmailStatus,
  ContactPriority,
  ContactRequestRecord,
  ContactSource,
} from "@/lib/contact/contact-types";
import { meterRuntimeActionForOwner } from "@/lib/action-credits/runtime-owner-metering";
import { isEmailConfigured } from "@/lib/email/email-config";

export type CreateContactRequestInput = {
  source: ContactSource | string;
  name: string;
  email: string;
  message: string;
  subject?: string | null;
  reason?: string | null;
  kind?: string | null;
  company?: string | null;
  plan_interest?: string | null;
  user_id?: string | null;
  owner_user_id?: string | null;
  project_id?: string | null;
  app_slug?: string | null;
  priority?: ContactPriority;
  metadata?: Record<string, unknown>;
  /** When set, charge Action Credits for notification email (generated apps). */
  meterEmailToOwner?: boolean;
  ownerUserEmail?: string | null;
  projectName?: string | null;
  isPlatformContact?: boolean;
};

export type CreateContactRequestResult =
  | { ok: true; request: ContactRequestRecord; emailStatus: ContactEmailStatus; emailError?: string }
  | { ok: false; error: string; code?: string };

function mapRow(row: Record<string, unknown>): ContactRequestRecord {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    user_id: (row.user_id as string | null) ?? null,
    owner_user_id: (row.owner_user_id as string | null) ?? null,
    project_id: (row.project_id as string | null) ?? null,
    app_slug: (row.app_slug as string | null) ?? null,
    source: String(row.source ?? "platform_contact"),
    name: String(row.name ?? row.email ?? "Visitor"),
    email: String(row.email),
    subject: (row.subject as string | null) ?? null,
    message: String(row.message ?? ""),
    reason: (row.reason as string | null) ?? null,
    kind: (row.kind as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    plan_interest: (row.plan_interest as string | null) ?? null,
    status: String(row.status ?? "new"),
    priority: String(row.priority ?? "normal"),
    email_status: String(row.email_status ?? "pending"),
    assigned_to: (row.assigned_to as string | null) ?? null,
    metadata: (typeof row.metadata === "object" && row.metadata && !Array.isArray(row.metadata)
      ? row.metadata
      : {}) as Record<string, unknown>,
  };
}

export async function createContactRequest(
  input: CreateContactRequestInput,
): Promise<CreateContactRequestResult> {
  const admin = createSupabaseAdmin();
  const initialEmailStatus: ContactEmailStatus = isEmailConfigured() ? "pending" : "skipped_no_config";

  const insertRow = {
    user_id: input.user_id ?? null,
    owner_user_id: input.owner_user_id ?? null,
    project_id: input.project_id ?? null,
    app_slug: input.app_slug ?? null,
    source: input.source,
    name: input.name.trim(),
    email: input.email.trim(),
    subject: input.subject?.trim() || input.reason?.trim() || null,
    message: input.message.trim(),
    reason: input.reason ?? null,
    kind: input.kind ?? null,
    company: input.company ?? null,
    team_size: null,
    expected_usage: null,
    current_plan: null,
    plan_interest: input.plan_interest ?? null,
    status: "new",
    priority: input.priority ?? "normal",
    email_status: initialEmailStatus,
    metadata: (input.metadata ?? {}) as Json,
  };

  const { data, error } = await admin
    .from("contact_requests")
    .insert(insertRow as never)
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save contact request" };
  }

  const request = mapRow(data as Record<string, unknown>);

  if (input.meterEmailToOwner && input.owner_user_id) {
    const charge = await meterRuntimeActionForOwner({
      ownerUserId: input.owner_user_id,
      projectId: input.project_id,
      actionType: "email_send_notification",
      operationId: `contact_email:${request.id}`,
      provider: "resend",
      providerCostUsd: 0.001,
      metadata: { contact_request_id: request.id, source: input.source },
    });
    if (!charge.ok) {
      await admin
        .from("contact_requests")
        .update({
          email_status: "skipped_insufficient_action_credits",
          metadata: {
            ...request.metadata,
            email_error: charge.ownerMessage,
            action_credit_blocked: true,
          } as Json,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", request.id);
      return {
        ok: true,
        request: { ...request, email_status: "skipped_insufficient_action_credits" },
        emailStatus: "skipped_insufficient_action_credits" as ContactEmailStatus,
        emailError: charge.ownerMessage,
      };
    }
  }

  const email = await sendContactNotificationEmail({
    request,
    ownerUserEmail: input.ownerUserEmail,
    projectName: input.projectName,
    isPlatformContact: input.isPlatformContact ?? !input.project_id,
  });

  await admin
    .from("contact_requests")
    .update({
      email_status: email.emailStatus,
      metadata: {
        ...request.metadata,
        ...(email.error ? { email_error: email.error } : {}),
        ...(email.emailStatus === "sent" ? { email_sent_at: new Date().toISOString() } : {}),
      } as Json,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", request.id);

  return {
    ok: true,
    request: { ...request, email_status: email.emailStatus },
    emailStatus: email.emailStatus,
    emailError: email.error,
  };
}

export async function retryContactRequestEmail(requestId: string): Promise<CreateContactRequestResult> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("contact_requests").select("*").eq("id", requestId).maybeSingle();
  if (error || !data) return { ok: false, error: "Contact request not found" };

  const request = mapRow(data as Record<string, unknown>);
  let ownerEmail: string | null = null;
  if (request.owner_user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(request.owner_user_id);
    ownerEmail = authUser?.user?.email ?? null;
  }

  let projectName: string | null = null;
  if (request.project_id) {
    const { data: project } = await admin.from("projects").select("name").eq("id", request.project_id).maybeSingle();
    projectName = project?.name ?? null;
  }

  const email = await sendContactNotificationEmail({
    request,
    ownerUserEmail: ownerEmail,
    projectName,
    isPlatformContact: !request.project_id,
  });

  await admin
    .from("contact_requests")
    .update({
      email_status: email.emailStatus,
      metadata: {
        ...request.metadata,
        email_retry_at: new Date().toISOString(),
        ...(email.error ? { email_error: email.error } : {}),
      } as Json,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", requestId);

  return {
    ok: true,
    request: { ...request, email_status: email.emailStatus },
    emailStatus: email.emailStatus,
    emailError: email.error,
  };
}
