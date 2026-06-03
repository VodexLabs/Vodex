import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { syncDiscordRoleForUser } from "@/lib/integrations/server/sync-discord-role-for-user";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncDiscordRoleForUser(user.id, { source: "manual_sync" });
  const status = result.ok ? 200 : result.status === "not_connected" ? 400 : 502;
  return NextResponse.json(result, { status });
}
