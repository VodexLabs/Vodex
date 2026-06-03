import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  consumeVerifiedDestructiveAction,
  deleteUserProjects,
} from "@/lib/security/destructive-action-verification";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { verificationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.verificationId?.trim()) {
    return NextResponse.json({ error: "verificationId is required" }, { status: 400 });
  }

  const consumed = await consumeVerifiedDestructiveAction({
    userId: user.id,
    verificationId: body.verificationId.trim(),
    actionType: "delete_workspace",
    targetId: null,
  });

  if (!consumed.ok) {
    const status = consumed.code === "not_verified" ? 403 : 400;
    return NextResponse.json({ error: consumed.error, code: consumed.code }, { status });
  }

  const admin = createSupabaseAdmin();
  try {
    const { deletedCount } = await deleteUserProjects(admin, user.id);

    await admin.from("workspaces").delete().eq("owner_id", user.id);

    return NextResponse.json({
      success: true,
      deletedProjects: deletedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workspace deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
