import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyDestructiveActionCode } from "@/lib/security/destructive-action-verification";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { verificationId?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.verificationId?.trim() || !body.code?.trim()) {
    return NextResponse.json({ error: "verificationId and code are required" }, { status: 400 });
  }

  const result = await verifyDestructiveActionCode({
    userId: user.id,
    verificationId: body.verificationId.trim(),
    code: body.code.trim(),
  });

  if (!result.ok) {
    const status = result.code === "invalid_otp" ? 401 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    verified: true,
    actionType: result.actionType,
    targetId: result.targetId,
  });
}
