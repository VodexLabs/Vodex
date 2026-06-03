import { createHash, randomInt } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendDestructiveActionEmail } from "@/lib/email/send-destructive-action-email";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  DESTRUCTIVE_ACTION_PHRASES,
  destructiveActionSummary,
  isDestructiveActionType,
  type DestructiveActionType,
} from "@/lib/security/destructive-action-types";

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_GRACE_MS = 5 * 60 * 1000;
const MAX_PENDING = 6;
const MAX_RESENDS = 4;
const RESEND_COOLDOWN_MS = 45_000;

function otpPepper(): string {
  return (
    process.env.DESTRUCTIVE_ACTION_OTP_SECRET?.trim() ||
    process.env.ADMIN_OTP_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "vodex-destructive-otp-pepper"
  );
}

function hashOtp(verificationId: string, otp: string): string {
  return createHash("sha256")
    .update(`${otpPepper()}:${verificationId}:${otp}`)
    .digest("hex");
}

function generateOtp(): string {
  return String(randomInt(100_000, 999_999));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function destructiveVerificationDb(): any {
  return createSupabaseAdmin();
}

type VerificationRow = {
  id: string;
  user_id: string;
  user_email: string;
  action_type: DestructiveActionType;
  target_id: string | null;
  otp_hash: string;
  expires_at: string;
  verified_at: string | null;
  consumed_at: string | null;
  resend_count: number;
  last_sent_at: string;
  metadata: Record<string, unknown> | null;
};

export async function startDestructiveActionVerification(input: {
  userId: string;
  userEmail: string;
  actionType: string;
  confirmationPhrase: string;
  targetId?: string | null;
  targetName?: string | null;
  resendVerificationId?: string | null;
}): Promise<
  | {
      ok: true;
      verificationId: string;
      expiresAt: string;
      message: string;
      devOtpHint?: string;
    }
  | { ok: false; error: string; code?: string; retryAfterSec?: number }
> {
  if (!isDestructiveActionType(input.actionType)) {
    return { ok: false, error: "Invalid action type", code: "invalid_action" };
  }

  const expectedPhrase = DESTRUCTIVE_ACTION_PHRASES[input.actionType];
  if (input.confirmationPhrase.trim().toLowerCase() !== expectedPhrase) {
    return {
      ok: false,
      error: `Type "${expectedPhrase}" exactly to continue.`,
      code: "invalid_phrase",
    };
  }

  const rateKey = `destructive:start:${input.userId}`;
  const limited = checkRateLimit(rateKey, 8, 10 * 60 * 1000);
  if (!limited.allowed) {
    return {
      ok: false,
      error: "Too many verification requests. Try again shortly.",
      code: "rate_limited",
      retryAfterSec: limited.retryAfterSec,
    };
  }

  const admin = destructiveVerificationDb();
  const summary = destructiveActionSummary(input.actionType, input.targetName);

  if (input.resendVerificationId) {
    const { data: existing } = await admin
      .from("destructive_action_verifications")
      .select("*")
      .eq("id", input.resendVerificationId)
      .eq("user_id", input.userId)
      .maybeSingle();

    const row = existing as VerificationRow | null;
    if (!row || row.consumed_at) {
      return { ok: false, error: "Verification session not found", code: "not_found" };
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "Verification expired. Start again.", code: "expired" };
    }
    if (row.resend_count >= MAX_RESENDS) {
      return { ok: false, error: "Resend limit reached. Start a new verification.", code: "resend_limit" };
    }
    const sinceSend = Date.now() - new Date(row.last_sent_at).getTime();
    if (sinceSend < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        error: "Please wait before requesting another code.",
        code: "resend_cooldown",
        retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - sinceSend) / 1000),
      };
    }

    const otp = generateOtp();
    const otpHash = hashOtp(row.id, otp);
    const emailResult = await sendDestructiveActionEmail({
      to: row.user_email,
      otp,
      actionSummary: summary,
      expiresMinutes: 10,
    });

    await admin
      .from("destructive_action_verifications")
      .update({
        otp_hash: otpHash,
        resend_count: row.resend_count + 1,
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return {
      ok: true,
      verificationId: row.id,
      expiresAt: row.expires_at,
      message: emailResult.message,
      devOtpHint: emailResult.channel === "dev_console" ? otp : undefined,
    };
  }

  const { count } = await admin
    .from("destructive_action_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());

  if ((count ?? 0) >= MAX_PENDING) {
    return {
      ok: false,
      error: "Too many pending verifications. Complete or wait for expiry.",
      code: "pending_limit",
    };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { data: row, error } = await admin
    .from("destructive_action_verifications")
    .insert({
      user_id: input.userId,
      user_email: input.userEmail.trim().toLowerCase(),
      action_type: input.actionType,
      target_id: input.targetId ?? null,
      otp_hash: "pending",
      expires_at: expiresAt,
      metadata: { summary, targetName: input.targetName ?? null },
    })
    .select("id")
    .single();

  if (error || !row?.id) {
    const missingTable =
      error?.message?.includes("destructive_action_verifications") ||
      error?.message?.includes("does not exist");
    return {
      ok: false,
      error: missingTable
        ? "destructive_action_verifications table missing — apply migration 20260724120000_destructive_action_verifications.sql"
        : error?.message ?? "Could not start verification",
      code: "db_error",
    };
  }

  const verificationId = row.id as string;
  const otpHash = hashOtp(verificationId, otp);

  await admin
    .from("destructive_action_verifications")
    .update({ otp_hash: otpHash })
    .eq("id", verificationId);

  const emailResult = await sendDestructiveActionEmail({
    to: input.userEmail,
    otp,
    actionSummary: summary,
    expiresMinutes: 10,
  });

  return {
    ok: true,
    verificationId,
    expiresAt,
    message: emailResult.message,
    devOtpHint: emailResult.channel === "dev_console" ? otp : undefined,
  };
}

export async function verifyDestructiveActionCode(input: {
  userId: string;
  verificationId: string;
  code: string;
}): Promise<
  | { ok: true; actionType: DestructiveActionType; targetId: string | null }
  | { ok: false; error: string; code?: string }
> {
  const admin = destructiveVerificationDb();
  const { data, error } = await admin
    .from("destructive_action_verifications")
    .select("*")
    .eq("id", input.verificationId)
    .eq("user_id", input.userId)
    .maybeSingle();

  const row = data as VerificationRow | null;
  if (error || !row) {
    return { ok: false, error: "Verification not found", code: "not_found" };
  }
  if (row.consumed_at) {
    return { ok: false, error: "Verification already used", code: "consumed" };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expired", code: "expired" };
  }
  if (!isDestructiveActionType(row.action_type)) {
    return { ok: false, error: "Invalid verification record", code: "invalid_action" };
  }

  const expected = hashOtp(input.verificationId, input.code.trim());
  if (expected !== row.otp_hash) {
    return { ok: false, error: "Invalid confirmation code", code: "invalid_otp" };
  }

  const verifiedAt = new Date().toISOString();
  await admin
    .from("destructive_action_verifications")
    .update({ verified_at: verifiedAt })
    .eq("id", row.id);

  return {
    ok: true,
    actionType: row.action_type,
    targetId: row.target_id,
  };
}

export async function consumeVerifiedDestructiveAction(input: {
  userId: string;
  verificationId: string;
  actionType: DestructiveActionType;
  targetId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const admin = destructiveVerificationDb();
  const { data, error } = await admin
    .from("destructive_action_verifications")
    .select("*")
    .eq("id", input.verificationId)
    .eq("user_id", input.userId)
    .maybeSingle();

  const row = data as VerificationRow | null;
  if (error || !row) {
    return { ok: false, error: "Verification not found", code: "not_found" };
  }
  if (row.consumed_at) {
    return { ok: false, error: "Verification already used", code: "consumed" };
  }
  if (!row.verified_at) {
    return { ok: false, error: "Email verification required", code: "not_verified" };
  }
  if (new Date(row.verified_at).getTime() + VERIFIED_GRACE_MS < Date.now()) {
    return { ok: false, error: "Verification expired — request a new code", code: "verified_expired" };
  }
  if (row.action_type !== input.actionType) {
    return { ok: false, error: "Action mismatch", code: "action_mismatch" };
  }
  const expectedTarget = input.targetId ?? null;
  const rowTarget = row.target_id ?? null;
  if (expectedTarget !== rowTarget) {
    return { ok: false, error: "Target mismatch", code: "target_mismatch" };
  }

  await admin
    .from("destructive_action_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true };
}

export async function deleteUserProjects(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
) {
  const { data: projects } = await admin.from("projects").select("id").eq("owner_id", userId);
  const ids = (projects ?? []).map((p) => (p as { id: string }).id);
  if (ids.length === 0) return { deletedCount: 0 };

  const { error } = await admin.from("projects").delete().eq("owner_id", userId);
  if (error) throw new Error(error.message);
  return { deletedCount: ids.length };
}

export async function deleteSingleProject(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  projectId: string,
) {
  const { data: project } = await admin
    .from("projects")
    .select("id, owner_id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || (project as { owner_id: string }).owner_id !== userId) {
    return { ok: false as const, error: "Project not found", code: "not_found" };
  }

  const { error } = await admin.from("projects").delete().eq("id", projectId).eq("owner_id", userId);
  if (error) return { ok: false as const, error: error.message, code: "delete_failed" };
  return { ok: true as const, name: (project as { name?: string }).name ?? "Project" };
}
