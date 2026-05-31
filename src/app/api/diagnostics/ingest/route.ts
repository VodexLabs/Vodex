import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { persistDiagnosticLogs } from "@/lib/diagnostics/persist-server-log";
import type { DreamosLogRow } from "@/lib/diagnostics/dreamos-logger";
import { sanitizeDiagnosticMetadata } from "@/lib/diagnostics/truncate-large-diagnostic-string";

const entrySchema = z.object({
  severity: z.enum(["debug", "info", "warn", "error"]).optional(),
  source: z.enum(["client", "server"]),
  category: z.string().optional(),
  route: z.string().nullable().optional(),
  component: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  message: z.string().min(1).max(2000),
  userId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  conversationId: z.string().uuid().nullable().optional(),
  buildId: z.string().uuid().nullable().optional(),
  at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const entriesRaw = Array.isArray(body?.entries) ? body.entries : [];
  const parsed: z.infer<typeof entrySchema>[] = [];
  for (const e of entriesRaw.slice(0, 50)) {
    const r = entrySchema.safeParse(e);
    if (r.success) parsed.push(r.data);
  }

  const rows: DreamosLogRow[] = parsed.map((e) => ({
    severity: e.severity ?? "info",
    source: e.source,
    category: (e.category ?? "general") as DreamosLogRow["category"],
    route: e.route ?? null,
    component: e.component ?? null,
    action: e.action ?? null,
    message: e.message,
    userId: e.userId ?? user.id,
    projectId: e.projectId ?? null,
    conversationId: e.conversationId ?? null,
    buildId: e.buildId ?? null,
    at: e.at ?? new Date().toISOString(),
    metadata: sanitizeDiagnosticMetadata((e.metadata ?? {}) as Record<string, unknown>),
  }));

  const result = await persistDiagnosticLogs(rows);

  return NextResponse.json({
    ok: true,
    accepted: rows.length,
    stored: result.stored,
    tableMissing: result.tableMissing,
  });
}
