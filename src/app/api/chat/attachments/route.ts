import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per chat attachment
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return base.length ? base : "file";
}

/**
 * POST multipart field "file" — uploads to chat-media under the user's folder.
 * Returns attachment row id + public URL for linking from /api/chat.
 */
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
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use PNG, JPEG, WebP, GIF, PDF, or plain text." },
        { status: 400 },
      );
    }

    const safeName = sanitizeFilename(file.name);
    const objectPath = `${user.id}/${randomUUID()}-${safeName}`;
    const buf = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage.from("chat-media").upload(objectPath, buf, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(objectPath);

    const { data: row, error: insErr } = await supabase
      .from("message_attachments")
      .insert({
        user_id: user.id,
        conversation_id: null,
        message_id: null,
        bucket_id: "chat-media",
        storage_path: objectPath,
        public_url: urlData.publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        file_name: file.name,
      })
      .select("id, public_url, mime_type, file_name, size_bytes")
      .single();

    if (insErr || !row) {
      return NextResponse.json(
        { error: insErr?.message ?? "Could not save attachment metadata" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: row.id,
      public_url: row.public_url,
      mime_type: row.mime_type,
      file_name: row.file_name,
      size_bytes: row.size_bytes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
