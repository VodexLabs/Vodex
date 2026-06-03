import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { STATUS_SCHEMA_INSTALL_HINT, isStatusSchemaMissingError } from "@/lib/status/status-db";
import { checkStatusSchemaReady, fetchPublicStatusPayload } from "@/lib/status/status-public";

export async function GET(request: Request) {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const bustCache = new URL(request.url).searchParams.get("refresh") === "1";
  const schemaReady = await checkStatusSchemaReady({ bustCache });
  if (!schemaReady) {
    return NextResponse.json({
      schemaReady: false,
      hint: STATUS_SCHEMA_INSTALL_HINT,
      components: [],
      announcements: [],
    });
  }

  const payload = await fetchPublicStatusPayload();
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ schemaReady: false, error: "Service role unavailable" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  let announcements: unknown[] | null = null;
  let error: { message?: string } | null = null;

  const fullSelect =
    "id,title,message,severity,banner_type,is_active,priority,link_label,link_url,gradient_from,gradient_to,text_color,icon_type,effect_key,background_preset,effect_preset,icon_preset,animated_icon_enabled,accent_color,outline_color,target_scope,target_plan,target_email,starts_at,ends_at,created_at";

  const res = await db
    .from("platform_announcements")
    .select(fullSelect)
    .order("created_at", { ascending: false })
    .limit(30);

  announcements = res.data;
  error = res.error;

  if (error && isStatusSchemaMissingError(error)) {
    const fallback = await db
      .from("platform_announcements")
      .select("id,title,message,severity,is_active,priority,link_label,link_url,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!fallback.error) {
      announcements = fallback.data;
      error = null;
    }
  }

  if (error && isStatusSchemaMissingError(error)) {
    const minimal = await db
      .from("platform_announcements")
      .select("id,title,message,severity,is_active,priority,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!minimal.error) {
      announcements = minimal.data;
      error = null;
    }
  }

  if (error && isStatusSchemaMissingError(error)) {
    return NextResponse.json({
      schemaReady: false,
      hint: STATUS_SCHEMA_INSTALL_HINT,
      components: [],
      announcements: [],
    });
  }

  return NextResponse.json({
    schemaReady: true,
    components: payload.ok ? payload.components : [],
    announcements: announcements ?? [],
    hint: null,
  });
}
