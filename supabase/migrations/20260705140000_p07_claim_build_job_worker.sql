-- P0.7: one async build worker per build_job (Next.js after() may run twice across workers).

create or replace function public.claim_build_job_worker(p_job_id uuid, p_operation_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows int;
begin
  update public.build_jobs
  set
    meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
      'async_worker', p_operation_id,
      'async_worker_at', to_jsonb(now())
    ),
    status = case when status in ('queued', 'starting') then 'running' else status end,
    started_at = coalesce(started_at, now())
  where id = p_job_id
    and (meta->>'async_worker' is null or meta->>'async_worker' = p_operation_id)
    and status not in ('completed', 'failed', 'cancelled');

  get diagnostics rows = row_count;
  return rows > 0;
end;
$$;

revoke all on function public.claim_build_job_worker(uuid, text) from public;
grant execute on function public.claim_build_job_worker(uuid, text) to service_role;

notify pgrst, 'reload schema';
