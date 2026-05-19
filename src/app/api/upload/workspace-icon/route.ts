import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ensurePublicBucket } from "@/lib/supabase/ensure-storage-bucket";
import { upsertUserProfile } from "@/lib/supabase/upsert-user-profile";
import { logAnalyticsAdmin } from "@/lib/log-analytics-admin";

const BUCKET = "workspace-icons";
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use PNG, JPG, or WEBP." }, { status: 400 });
    }

    const { data: workspaceRow } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const workspaceId = workspaceRow?.id ?? user.id;
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : "png";
    const objectPath = `${workspaceId}/icon.${ext}`;

    let admin;
    try {
      admin = createSupabaseAdmin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Server configuration error";
      return NextResponse.json(
        { error: msg, hint: "Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to .env.local (server only)." },
        { status: 503 },
      );
    }

    const bucket = await ensurePublicBucket(admin, BUCKET);
    if (!bucket.ok) {
      await logAnalyticsAdmin(admin, {
        user_id: user.id,
        event_type: "storage_error",
        properties: { scope: "workspace_icon", step: "ensure_bucket", message: bucket.error },
      });
      return NextResponse.json(
        { error: bucket.error, hint: bucket.hint ?? "Create the bucket in Supabase Storage." },
        { status: 500 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "86400",
    });

    if (uploadErr) {
      await logAnalyticsAdmin(admin, {
        user_id: user.id,
        event_type: "storage_error",
        properties: { scope: "workspace_icon", step: "storage_upload", message: uploadErr.message, path: objectPath },
      });
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;
    const iconWithBust = `${publicUrl}?t=${Date.now()}`;

    const { data: profile, error: profileErr } = await upsertUserProfile(admin, user.id, user.email ?? "", {
      workspace_icon_url: iconWithBust,
    });

    if (profileErr || !profile) {
      const wid =
        workspaceRow?.id ??
        (
          await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle()
        ).data?.id;

      if (wid) {
        const { error: wsErr } = await admin.from("workspaces").update({ avatar_url: iconWithBust }).eq("id", wid);
        if (!wsErr) {
          return NextResponse.json({
            publicUrl,
            path: objectPath,
            workspaceId: wid,
            profile: null,
            workspaceAvatarSaved: true,
            note:
              "Saved to workspaces.avatar_url (profiles row unavailable — apply migrations / reload schema to sync profile).",
          });
        }
      }

      await logAnalyticsAdmin(admin, {
        user_id: user.id,
        event_type: "storage_error",
        properties: {
          scope: "workspace_icon",
          step: "profile_update",
          message: profileErr?.message ?? "Profile update failed",
          path: objectPath,
        },
      });
      return NextResponse.json(
        {
          error: profileErr?.message ?? "Profile update failed",
          hint: "Icon uploaded but workspace icon URL could not be saved. Check SUPABASE_SERVICE_ROLE_KEY and profiles table.",
          publicUrl,
          path: objectPath,
          workspaceId,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ publicUrl, path: objectPath, workspaceId, profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
