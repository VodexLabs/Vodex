import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  consumeVerifiedDestructiveAction,
  deleteSingleProject,
} from "@/lib/security/destructive-action-verification";
import type { DestructiveActionType } from "@/lib/security/destructive-action-types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    verificationId?: string;
    actionType?: DestructiveActionType;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.verificationId?.trim()) {
    return NextResponse.json({ error: "verificationId is required" }, { status: 400 });
  }

  const actionType: DestructiveActionType =
    body.actionType === "delete_failed_project" ? "delete_failed_project" : "delete_project";

  const consumed = await consumeVerifiedDestructiveAction({
    userId: user.id,
    verificationId: body.verificationId.trim(),
    actionType,
    targetId: projectId,
  });

  if (!consumed.ok) {
    const status = consumed.code === "not_verified" ? 403 : 400;
    return NextResponse.json({ error: consumed.error, code: consumed.code }, { status });
  }

  const admin = createSupabaseAdmin();
  const deleted = await deleteSingleProject(admin, user.id, projectId);
  if (!deleted.ok) {
    return NextResponse.json({ error: deleted.error, code: deleted.code }, { status: 404 });
  }

  return NextResponse.json({ success: true, projectId, name: deleted.name });
}
