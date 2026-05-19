import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Body = { email?: string; role?: string };

function mapInviteRole(r: string | undefined): "admin" | "editor" | "viewer" {
  if (r === "admin") return "admin";
  if (r === "viewer") return "viewer";
  return "editor";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const role = mapInviteRole(body.role);

  const { data: owned } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!owned?.id) {
    return NextResponse.json({ error: "No workspace found for this account" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const writer = admin ?? supabase;

  const { data: row, error } = await writer
    .from("team_members")
    .insert({
      workspace_id: owned.id,
      email,
      role,
      invited_by: user.id,
      status: "pending",
      user_id: null,
    } as never)
    .select("id, email, role, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invite: row });
}
