import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Writer = SupabaseClient<Database>;

function terminalWriter(writer: Writer): Writer {
  return (createServiceRoleClient() ?? writer) as Writer;
}

export type BuildWorkerContext = {
  operationId: string;
  executionInstanceId: string;
  workerId: string;
};

export function createBuildWorkerContext(operationId: string): BuildWorkerContext {
  const executionInstanceId = `${operationId}:${randomUUID()}`;
  return {
    operationId,
    executionInstanceId,
    workerId: executionInstanceId,
  };
}

/** Atomically claim a build job — false means another worker owns it. */
export async function claimBuildJobWorker(
  writer: Writer,
  jobId: string,
  ctx: BuildWorkerContext,
): Promise<{ claimed: boolean; error?: string }> {
  const { data, error } = await terminalWriter(writer).rpc("claim_build_job_worker" as never, {
    p_job_id: jobId,
    p_operation_id: ctx.operationId,
    p_execution_instance_id: ctx.executionInstanceId,
  } as never);

  if (error) {
    return { claimed: false, error: error.message };
  }
  return { claimed: data === true };
}

export async function transitionBuildJobStatus(
  writer: Writer,
  input: {
    jobId: string;
    ctx: BuildWorkerContext;
    toStatus: "running" | "completed" | "failed";
    reason?: string;
  },
): Promise<boolean> {
  const { data, error } = await terminalWriter(writer).rpc("transition_build_job_status" as never, {
    p_job_id: input.jobId,
    p_execution_instance_id: input.ctx.executionInstanceId,
    p_to_status: input.toStatus,
    p_reason: input.reason ?? null,
  } as never);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[build-job-terminal] transition failed:", error.message);
    }
    return false;
  }
  return data === true;
}
