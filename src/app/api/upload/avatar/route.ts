import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ensurePublicBucket } from "@/lib/supabase/ensure-storage-bucket";
import { upsertUserProfile } from "@/lib/supabase/upsert-user-profile";
import { logAnalyticsAdmin } from "@/lib/log-analytics-admin";

const BUCKET = "avatars";
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

    const ext = file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : "png";
    const objectPath = `${user.id}/avatar.${ext}`;

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
        properties: { scope: "avatar", step: "ensure_bucket", message: bucket.error },
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
      cacheControl: "3600",
    });

    if (uploadErr) {
      await logAnalyticsAdmin(admin, {
        user_id: user.id,
        event_type: "storage_error",
        properties: { scope: "avatar", step: "storage_upload", message: uploadErr.message, path: objectPath },
      });
      return NextResponse.json(
        { error: uploadErr.message, hint: "Check bucket is public and policies allow service role upload." },
        { status: 500 },
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;
    const avatarWithBust = `${publicUrl}?t=${Date.now()}`;

    const { data: profile, error: profileErr } = await upsertUserProfile(admin, user.id, user.email ?? "", {
      avatar_url: avatarWithBust,
    });

    if (profileErr || !profile) {
      await logAnalyticsAdmin(admin, {
        user_id: user.id,
        event_type: "storage_error",
        properties: {
          scope: "avatar",
          step: "profile_update",
          message: profileErr?.message ?? "Profile update failed",
          path: objectPath,
        },
      });
      return NextResponse.json(
        {
          error: profileErr?.message ?? "Profile update failed",
          hint: "Avatar uploaded but profile could not be saved. Ensure SUPABASE_SERVICE_ROLE_KEY is set and the profiles table exists.",
          publicUrl,
          path: objectPath,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ publicUrl, path: objectPath, profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
