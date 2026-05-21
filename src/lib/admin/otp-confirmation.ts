import { createHash, randomInt } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { DREAMOS_OWNER_EMAIL } from "@/lib/admin-owner";
import { sendOwnerOtpEmail } from "@/lib/admin/send-owner-otp-email";
import { sanitizeDiagnosticMetadata } from "@/lib/diagnostics/sanitize-metadata";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_PER_ADMIN = 8;

export type AdminPendingActionType =
  | "add_tokens"
  | "set_balance"
  | "reset_monthly"
  | "set_plan"
  | "suspend"
  | "unsuspend";

export type AdminActionPayload = {
  action: AdminPendingActionType;
  targetUserId: string;
  reason?: string;
  amount?: number;
  balance?: number;
  planId?: string;
};

function otpPepper(): string {
  return (
    process.env.ADMIN_OTP_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dreamos-dev-otp-pepper"
  );
}

function hashOtp(pendingId: string, otp: string): string {
  return createHash("sha256")
    .update(`${otpPepper()}:${pendingId}:${otp}`)
    .digest("hex");
}

function generateOtp(): string {
  return String(randomInt(100_000, 999_999));
}

function actionSummary(payload: AdminActionPayload): string {
  switch (payload.action) {
    case "add_tokens":
      return `Add ${payload.amount} credits to user ${payload.targetUserId.slice(0, 8)}…`;
    case "set_balance":
      return `Set balance to ${payload.balance} for user ${payload.targetUserId.slice(0, 8)}…`;
    case "reset_monthly":
      return `Reset monthly credits for user ${payload.targetUserId.slice(0, 8)}…`;
    case "set_plan":
      return `Set plan to ${payload.planId} for user ${payload.targetUserId.slice(0, 8)}…`;
    case "suspend":
      return `Suspend user ${payload.targetUserId.slice(0, 8)}…`;
    case "unsuspend":
      return `Unsuspend user ${payload.targetUserId.slice(0, 8)}…`;
    default:
      return payload.action;
  }
}

export async function createAdminPendingConfirmation(input: {
  adminId: string;
  adminEmail: string | null;
  payload: AdminActionPayload;
}): Promise<
  | { ok: true; pendingId: string; expiresAt: string; devOtpHint?: string }
  | { ok: false; error: string }
> {
  const db = createSupabaseAdmin() as unknown as {
    from: (table: string) => {
      select: (cols: string, opts?: { count?: string; head?: boolean }) => {
        eq: (col: string, val: string) => {
          is: (col: string, val: null) => { gt: (col: string, val: string) => Promise<{ count: number | null }> };
        };
      };
      insert: (row: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
      };
      update: (row: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
    };
  };

  const { count } = await db
    .from("admin_pending_confirmations")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", input.adminId)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());

  if ((count ?? 0) >= MAX_PENDING_PER_ADMIN) {
    return { ok: false, error: "Too many pending confirmations. Complete or wait for expiry." };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const safePayload = sanitizeDiagnosticMetadata(
    input.payload as unknown as Record<string, unknown>,
  );

  const { data: row, error } = await db
    .from("admin_pending_confirmations")
    .insert({
      admin_id: input.adminId,
      admin_email: input.adminEmail ?? DREAMOS_OWNER_EMAIL,
      target_id: input.payload.targetUserId,
      action_type: input.payload.action,
      action_payload: safePayload,
      otp_hash: "pending",
      expires_at: expiresAt,
      metadata: { summary: actionSummary(input.payload) },
    } as never)
    .select("id")
    .single();

  if (error || !row?.id) {
    return {
      ok: false,
      error:
        error?.message?.includes("admin_pending_confirmations") ||
        error?.message?.includes("does not exist")
          ? "admin_pending_confirmations table missing — run Supabase migration 20260622120000_admin_otp_diagnostic_logs.sql"
          : error?.message ?? "Could not create pending confirmation",
    };
  }

  const pendingId = row.id as string;
  const otpHash = hashOtp(pendingId, otp);

  await db
    .from("admin_pending_confirmations")
    .update({ otp_hash: otpHash })
    .eq("id", pendingId);

  const emailResult = await sendOwnerOtpEmail({
    otp,
    actionSummary: actionSummary(input.payload),
    expiresMinutes: 10,
  });

  return {
    ok: true,
    pendingId,
    expiresAt,
    devOtpHint: emailResult.channel === "dev_console" ? otp : undefined,
  };
}

export async function verifyAdminPendingOtp(input: {
  pendingId: string;
  otp: string;
  adminId: string;
}): Promise<
  | { ok: true; payload: AdminActionPayload }
  | { ok: false; error: string; code?: string }
> {
  const db = createSupabaseAdmin() as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        };
      };
      update: (row: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
    };
  };

  const { data: row, error } = await db
    .from("admin_pending_confirmations")
    .select("id, admin_id, action_type, action_payload, otp_hash, expires_at, consumed_at")
    .eq("id", input.pendingId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Pending confirmation not found", code: "not_found" };
  }

  const pending = row as {
    admin_id: string;
    consumed_at: string | null;
    expires_at: string;
    otp_hash: string;
    action_payload: AdminActionPayload;
  };

  if (pending.admin_id !== input.adminId) {
    return { ok: false, error: "Not authorized for this confirmation", code: "forbidden" };
  }

  if (pending.consumed_at) {
    return { ok: false, error: "Confirmation already used", code: "consumed" };
  }

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Confirmation code expired", code: "expired" };
  }

  const expected = hashOtp(input.pendingId, input.otp.trim());
  if (expected !== pending.otp_hash) {
    return { ok: false, error: "Invalid confirmation code", code: "invalid_otp" };
  }

  await db
    .from("admin_pending_confirmations")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", input.pendingId);

  return { ok: true, payload: pending.action_payload };
}
