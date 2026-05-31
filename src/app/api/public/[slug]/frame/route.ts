import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { planPublishedRender } from "@/lib/publish/published-renderer";
import { stripSecretsFromFiles } from "@/lib/preview/preview-sandbox";
import type { PublishedSnapshotFile } from "@/lib/publish/published-snapshot";

export const dynamic = "force-dynamic";

/** Serves published app HTML for iframe src — keeps giant HTML off the client React tree. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const safe = slug?.trim().toLowerCase();
  if (!safe) return new NextResponse("Not found", { status: 404 });

  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Unavailable", { status: 503 });

  const { data: published } = (await admin
    .from("published_apps" as never)
    .select("status, title, description, public_url, snapshot_files, version")
    .eq("slug", safe)
    .maybeSingle()) as {
    data: {
      status?: string;
      title?: string | null;
      description?: string | null;
      public_url?: string;
      snapshot_files?: PublishedSnapshotFile[] | null;
      version?: number;
    } | null;
  };

  if (!published || published.status !== "published") {
    return new NextResponse("Not found", { status: 404 });
  }

  const files = stripSecretsFromFiles(
    Array.isArray(published.snapshot_files) ? published.snapshot_files : [],
  );
  if (files.length === 0) return new NextResponse("Not found", { status: 404 });

  const plan = planPublishedRender({
    title: published.title ?? safe,
    description: published.description ?? null,
    publicUrl: published.public_url ?? "",
    version: published.version ?? 1,
    files,
  });

  if (!plan.html?.trim()) {
    return new NextResponse("App not ready", { status: 503 });
  }

  return new NextResponse(plan.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
