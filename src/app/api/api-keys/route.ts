import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { resolveWorkspaceIdForUser } from "@/lib/identity/resolve-workspace-id";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(["read", "write", "deploy", "admin"])).default(["read"]),
  expiresAt: z.string().datetime().optional(),
});

const revokeSchema = z.object({
  id: z.string().uuid(),
});

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select(
      "id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at, request_count, workspace_id, owner_id",
    )
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    const fallback = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at, request_count")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    return NextResponse.json({ keys: fallback.data ?? [] });
  }

  return NextResponse.json({ keys: keys ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { name, scopes, expiresAt } = parsed.data;

  const { count } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Maximum 10 API keys allowed" }, { status: 400 });
  }

  const rawKey = `sk-dream-live-${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = `${rawKey.slice(0, 18)}…`;
  const workspaceId = await resolveWorkspaceIdForUser(supabase, user.id);

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    owner_id: user.id,
    workspace_id: workspaceId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
    status: "active",
    expires_at: expiresAt ?? null,
  };

  type CreatedKey = {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    created_at: string;
    expires_at: string | null;
    full_key?: string;
  };

  let created: CreatedKey | null = null;
  let insertError: { message: string } | null = null;

  const fullInsert = await supabase
    .from("api_keys")
    .insert(insertRow as never)
    .select("id, name, key_prefix, scopes, created_at, expires_at")
    .single();

  if (fullInsert.error?.message?.includes("column")) {
    const slim = {
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      expires_at: expiresAt ?? null,
    };
    const retry = await supabase
      .from("api_keys")
      .insert(slim as never)
      .select("id, name, key_prefix, scopes, created_at, expires_at")
      .single();
    created = retry.data as CreatedKey | null;
    insertError = retry.error;
  } else {
    created = fullInsert.data as CreatedKey | null;
    insertError = fullInsert.error;
  }

  if (insertError || !created) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ key: { ...created, full_key: rawKey } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: key } = await supabase
    .from("api_keys")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .single();

  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString(), status: "revoked" } as never)
    .eq("id", parsed.data.id);

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id, name } = parsed.data;

  const { error } = await supabase.from("api_keys").update({ name }).eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
