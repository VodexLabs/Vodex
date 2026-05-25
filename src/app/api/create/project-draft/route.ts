import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { bootstrapProfileFromOAuth } from "@/lib/auth/profile-bootstrap";
import {
  buildCreateIdempotencyKey,
  findProjectByCreateIdempotency,
  idempotencyMetadataPatch,
} from "@/lib/projects/create-project-idempotency";

function slugFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "app";
}

/**
 * POST — create a draft project for the signed-in user (build mode bootstrap).
 * Uses service role when available so RLS/schema drift does not block creation.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name = "New app";
  let idempotencyKey: string | null = null;
  let sessionId: string | null = null;
  let activeDraftId: string | null = null;
  try {
    const body = (await request.json()) as {
      name?: string;
      idempotencyKey?: string;
      sessionId?: string;
      activeDraftId?: string;
    };
    if (typeof body.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 80);
    }
    idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : null;
    sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : null;
    activeDraftId = typeof body.activeDraftId === "string" ? body.activeDraftId.trim() : null;
  } catch {
    /* optional body */
  }

  try {
    await bootstrapProfileFromOAuth(user, null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "profile_bootstrap_failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const writer = admin ?? supabase;

  const resolvedKey =
    idempotencyKey ||
    (sessionId ? buildCreateIdempotencyKey(user.id, sessionId, activeDraftId) : null);

  if (resolvedKey) {
    const existing = await findProjectByCreateIdempotency(writer, user.id, resolvedKey);
    if (existing?.id) {
      return NextResponse.json({ projectId: existing.id, reused: true });
    }
  }

  const slug = `${slugFromTitle(name)}-${Date.now().toString(36)}`;

  const { data, error } = await writer
    .from("projects")
    .insert({
      owner_id: user.id,
      name,
      slug,
      status: "building",
      framework: "nextjs",
      metadata: {
        shell_only: true,
        ...(resolvedKey ? idempotencyMetadataPatch(resolvedKey) : {}),
      },
    } as never)
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      {
        error: "Could not create app project",
        hint: error?.message ?? "Check Supabase migrations and projects table RLS.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ projectId: data.id });
}
