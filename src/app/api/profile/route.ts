import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { upsertUserProfile } from "@/lib/supabase/upsert-user-profile";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

function stripUrlQuery(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value === "") return null;
  return value.split("?")[0] || value;
}

const patchSchema = z
  .object({
    full_name: z.string().min(1).max(200).optional(),
    workspace_name: z.string().min(1).max(200).optional(),
    workspace_description: z.string().max(8000).optional(),
    workspace_icon_url: z.union([z.string().url(), z.null()]).optional(),
    avatar_url: z.union([z.string().url(), z.null()]).optional(),
    signup_wizard_completed: z.boolean().optional(),
    signup_heard_about: z.string().max(500).optional().nullable(),
    signup_referral_code: z.string().max(120).optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    public_profile_enabled: z.boolean().optional(),
    show_apps_on_profile: z.boolean().optional(),
    show_follower_count: z.boolean().optional(),
    allow_follows: z.boolean().optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const updates: ProfileUpdate = {};

  if (payload.full_name !== undefined) updates.full_name = payload.full_name;
  if (payload.workspace_name !== undefined) updates.workspace_name = payload.workspace_name;
  if (payload.workspace_description !== undefined) {
    updates.workspace_description = payload.workspace_description;
  }
  if (payload.workspace_icon_url !== undefined) {
    updates.workspace_icon_url = stripUrlQuery(payload.workspace_icon_url) ?? null;
  }
  if (payload.avatar_url !== undefined) {
    updates.avatar_url = stripUrlQuery(payload.avatar_url) ?? null;
  }
  if (payload.signup_wizard_completed !== undefined) {
    (updates as Record<string, unknown>).signup_wizard_completed =
      payload.signup_wizard_completed;
  }
  if (payload.signup_heard_about !== undefined) {
    (updates as Record<string, unknown>).signup_heard_about = payload.signup_heard_about;
  }
  if (payload.signup_referral_code !== undefined) {
    (updates as Record<string, unknown>).signup_referral_code =
      payload.signup_referral_code;
  }
  if (payload.bio !== undefined) (updates as Record<string, unknown>).bio = payload.bio;
  if (payload.public_profile_enabled !== undefined) {
    (updates as Record<string, unknown>).public_profile_enabled = payload.public_profile_enabled;
  }
  if (payload.show_apps_on_profile !== undefined) {
    (updates as Record<string, unknown>).show_apps_on_profile = payload.show_apps_on_profile;
  }
  if (payload.show_follower_count !== undefined) {
    (updates as Record<string, unknown>).show_follower_count = payload.show_follower_count;
  }
  if (payload.allow_follows !== undefined) {
    (updates as Record<string, unknown>).allow_follows = payload.allow_follows;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json(
      {
        error: msg,
        hint: "Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to .env.local — server only, never NEXT_PUBLIC.",
      },
      { status: 503 },
    );
  }

  const email = user.email ?? "";
  const { data: profile, error } = await upsertUserProfile(admin, user.id, email, updates);

  if (error || !profile) {
    return NextResponse.json(
      { error: error?.message ?? "Save failed (no profile returned)" },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile });
}

