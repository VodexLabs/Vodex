import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { verifyAdminPendingOtp } from "@/lib/admin/otp-confirmation";
import {
  executeAdminAction,
  fetchAdminUserAfterAction,
} from "@/lib/admin/execute-admin-action";
import { dreamosLog } from "@/lib/diagnostics/dreamos-logger";

const bodySchema = z.object({
  pendingId: z.string().uuid(),
  otp: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const verified = await verifyAdminPendingOtp({
    pendingId: parsed.data.pendingId,
    otp: parsed.data.otp,
    adminId: gate.user.id,
  });

  if (!verified.ok) {
    dreamosLog({
      source: "server",
      category: "admin",
      severity: "warn",
      message: verified.error,
      userId: gate.user.id,
      action: "admin_confirmation_failed",
      metadata: { code: verified.code, pendingId: parsed.data.pendingId },
    });
    return NextResponse.json(
      { error: verified.error, code: verified.code },
      { status: verified.code === "invalid_otp" ? 401 : 400 },
    );
  }

  const executed = await executeAdminAction({
    adminUser: gate.user,
    payload: verified.payload,
    request,
    otpVerified: true,
  });

  if (!executed.ok) {
    dreamosLog({
      source: "server",
      category: "admin",
      severity: "error",
      message: executed.error,
      userId: gate.user.id,
      action: "admin_action_execute_failed",
    });
    return NextResponse.json({ error: executed.error }, { status: 500 });
  }

  const user = await fetchAdminUserAfterAction(executed.userId);

  dreamosLog({
    source: "server",
    category: "admin",
    severity: "info",
    message: `Admin action executed: ${verified.payload.action}`,
    userId: gate.user.id,
    action: "admin_action_confirmed",
    metadata: { targetUserId: verified.payload.targetUserId },
  });

  return NextResponse.json({ success: true, user, credits: executed.credits });
}
