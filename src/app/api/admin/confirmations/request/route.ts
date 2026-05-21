import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import {
  createAdminPendingConfirmation,
  type AdminActionPayload,
} from "@/lib/admin/otp-confirmation";
import { dreamosLog } from "@/lib/diagnostics/dreamos-logger";

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum([
    "add_tokens",
    "set_balance",
    "reset_monthly",
    "set_plan",
    "suspend",
    "unsuspend",
  ]),
  reason: z.string().min(1).max(500).optional(),
  amount: z.number().int().min(1).max(1_000_000).optional(),
  balance: z.number().int().min(0).max(10_000_000).optional(),
  planId: z.enum(["free", "starter", "pro", "business", "infinity", "enterprise"]).optional(),
});

export async function POST(request: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const payload: AdminActionPayload = {
    action: parsed.data.action,
    targetUserId: parsed.data.targetUserId,
    reason: parsed.data.reason,
    amount: parsed.data.amount,
    balance: parsed.data.balance,
    planId: parsed.data.planId,
  };

  const result = await createAdminPendingConfirmation({
    adminId: gate.user.id,
    adminEmail: gate.user.email ?? null,
    payload,
  });

  if (!result.ok) {
    dreamosLog({
      source: "server",
      category: "admin",
      severity: "error",
      message: result.error,
      userId: gate.user.id,
      action: "admin_confirmation_request_failed",
    });
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  dreamosLog({
    source: "server",
    category: "admin",
    severity: "info",
    message: `Admin confirmation requested: ${parsed.data.action}`,
    userId: gate.user.id,
    metadata: { pendingId: result.pendingId, targetUserId: parsed.data.targetUserId },
    action: "admin_confirmation_pending",
  });

  return NextResponse.json({
    ok: true,
    pendingId: result.pendingId,
    expiresAt: result.expiresAt,
    message: "Confirmation code sent to dreamos86app@gmail.com",
    devOtpHint: result.devOtpHint,
  });
}
