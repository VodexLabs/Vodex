import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startDestructiveActionVerification } from "@/lib/security/destructive-action-verification";
import { rateLimitedResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    actionType?: string;
    confirmationPhrase?: string;
    targetId?: string | null;
    targetName?: string | null;
    resendVerificationId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await startDestructiveActionVerification({
    userId: user.id,
    userEmail: user.email,
    actionType: body.actionType ?? "",
    confirmationPhrase: body.confirmationPhrase ?? "",
    targetId: body.targetId ?? null,
    targetName: body.targetName ?? null,
    resendVerificationId: body.resendVerificationId ?? null,
  });

  if (!result.ok) {
    if (result.code === "rate_limited" && result.retryAfterSec) {
      return rateLimitedResponse(result.retryAfterSec);
    }
    const status =
      result.code === "invalid_phrase"
        ? 400
        : result.code === "resend_cooldown"
          ? 429
          : 400;
    return NextResponse.json(
      { error: result.error, code: result.code, retryAfterSec: result.retryAfterSec },
      { status },
    );
  }

  return NextResponse.json({
    verificationId: result.verificationId,
    expiresAt: result.expiresAt,
    message: result.message,
    devOtpHint: result.devOtpHint,
  });
}
