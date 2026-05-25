import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: job } = await supabase
    .from("build_jobs")
    .select("id, status, error_message, created_at, completed_at")
    .eq("id", jobId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  let eventsQuery = supabase
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
    return NextResponse.json({ error: evErr.message }, { status: 500 });
  }

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      error_message: job.error_message,
      started_at: job.created_at,
      completed_at: job.completed_at,
    },
    events: events ?? [],
  });
}
