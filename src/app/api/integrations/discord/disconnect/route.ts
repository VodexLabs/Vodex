import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { clearDiscordLink } from "@/lib/integrations/server/sync-discord-role-for-user";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearDiscordLink(user.id);
  return NextResponse.json({ ok: true });
}
