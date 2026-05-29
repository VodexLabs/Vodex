import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { shouldLogBuildEvents404 } from "@/lib/build/build-events-404-dedupe";
import {
  buildJobEventsSetupWarning,
  isBuildEventsSchemaError,
  markBuildJobEventsTableMissing,
} from "@/lib/build/build-events-schema-health";

export const dynamic = "force-dynamic";

function jobProgressFromEvents(
  events: Array<{ progress_percent: number | null }>,
  status: string,
): number {
  for (let i = events.length - 1; i >= 0; i--) {
    const p = events[i]?.progress_percent;
    if (p != null && p > 0) return p;
  }
  if (status === "completed") return 100;
  if (status === "failed") return 0;
  if (status === "running" || status === "starting") return 1;
  return 1;
}

/** Poll live build progress events for an async job. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; jobId: string }> },
) {
  const { id: projectId, jobId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!proj) {
    if (shouldLogBuildEvents404(projectId, jobId)) {
      console.warn("[build-events] project not found", { projectId, jobId });
    }
    return NextResponse.json({ ok: false, error: "Not found", code: "project_not_found" }, { status: 404 });
  }

  const reader = createServiceRoleClient() ?? supabase;
  const { data: job } = await reader
    .from("build_jobs")
    .select("id, status, error_message, created_at, completed_at, started_at")
    .eq("id", jobId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!job) {
    if (shouldLogBuildEvents404(projectId, jobId)) {
      console.warn("[build-events] job not found", { projectId, jobId });
    }
    return NextResponse.json(
      { ok: false, error: "Job not found", code: "job_not_found" },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  let eventsQuery = reader
    .from("build_job_events")
    .select("id, created_at, type, title, detail, file_path, progress_percent, metadata")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (after) {
    eventsQuery = eventsQuery.gt("created_at", after);
  }

  const { data: events, error: evErr } = await eventsQuery;
  if (evErr) {
    if (isBuildEventsSchemaError(evErr.message ?? "")) {
      markBuildJobEventsTableMissing(true);
      const status =
        job.status === "running" ? "starting" : (job.status ?? "running");
      return NextResponse.json({
        ok: true,
        setup_warning: buildJobEventsSetupWarning(),
        job: {
          id: job.id,
          status,
          progress: status === "starting" || status === "running" ? 1 : 0,
          error_message: job.error_message,
          started_at: job.started_at ?? job.created_at,
          completed_at: job.completed_at,
        },
        events: [],
      });
    }
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
  }

  markBuildJobEventsTableMissing(false);

  const list = events ?? [];
  const status =
    job.status === "running" && list.length === 0 ? "starting" : (job.status ?? "running");
  const progress = jobProgressFromEvents(list, status);

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status,
      progress: Math.max(progress, list.length === 0 && (status === "starting" || status === "running") ? 1 : progress),
      error_message: job.error_message,
      started_at: job.started_at ?? job.created_at,
      completed_at: job.completed_at,
    },
    events: list,
  });
}
