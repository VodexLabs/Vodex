-- P0.8: exactly-once build workers, terminal transitions, status audit.

alter table public.build_jobs add column if not exists claimed_by text;
alter table public.build_jobs add column if not exists claimed_at timestamptz;
alter table public.build_jobs add column if not exists execution_instance_id text;
alter table public.build_jobs add column if not exists terminal_reason text;

create index if not exists build_jobs_execution_instance_idx
  on public.build_jobs (execution_instance_id)
  where execution_instance_id is not null;

create table if not exists public.build_job_status_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid not null references public.build_jobs (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  from_status text,
  to_status text not null,
  worker_id text,
  execution_instance_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists build_job_status_events_job_idx
  on public.build_job_status_events (job_id, created_at desc);

alter table public.build_job_status_events enable row level security;

grant select, insert on table public.build_job_status_events to service_role;

drop function if exists public.claim_build_job_worker(uuid, text);

-- First claim wins; same operation_id cannot claim twice with different instances.
create or replace function public.claim_build_job_worker(
  p_job_id uuid,
  p_operation_id text,
  p_execution_instance_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows int;
begin
  if p_execution_instance_id is null or length(trim(p_execution_instance_id)) = 0 then
    return false;
  end if;

  update public.build_jobs
  set
    claimed_by = p_operation_id,
    claimed_at = now(),
    execution_instance_id = p_execution_instance_id,
    meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
      'async_worker', p_execution_instance_id,
      'async_worker_at', to_jsonb(now()),
      'operation_id', p_operation_id
    ),
    status = case when status in ('queued', 'starting') then 'running' else status end,
    started_at = coalesce(started_at, now())
  where id = p_job_id
    and execution_instance_id is null
    and coalesce(meta->>'execution_instance_id', '') = ''
    and status not in ('completed', 'failed', 'cancelled');

  get diagnostics rows = row_count;
  return rows > 0;
end;
$$;

create or replace function public.transition_build_job_status(
  p_job_id uuid,
  p_execution_instance_id text,
  p_to_status text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur record;
  allowed boolean := false;
begin
  select id, status, execution_instance_id, project_id, claimed_by
  into cur
  from public.build_jobs
  where id = p_job_id
  for update;

  if cur.id is null then
    return false;
  end if;

  if cur.execution_instance_id is distinct from p_execution_instance_id then
    return false;
  end if;

  if cur.status = 'completed' and p_to_status = 'failed' then
    return false;
  end if;

  if cur.status = 'failed' and p_to_status = 'completed' then
    return false;
  end if;

  if cur.status in ('completed', 'failed', 'cancelled') and cur.status is distinct from p_to_status then
    return false;
  end if;

  allowed :=
    (cur.status in ('queued', 'starting') and p_to_status = 'running')
    or (cur.status = 'running' and p_to_status in ('completed', 'failed'))
    or (cur.status = p_to_status);

  if not allowed then
    return false;
  end if;

  update public.build_jobs
  set
    status = p_to_status,
    terminal_reason = case
      when p_to_status in ('completed', 'failed') then coalesce(p_reason, terminal_reason)
      else terminal_reason
    end,
    completed_at = case
      when p_to_status in ('completed', 'failed') then coalesce(completed_at, now())
      else completed_at
    end,
    error_message = case
      when p_to_status = 'failed' then left(coalesce(p_reason, error_message), 2000)
      when p_to_status = 'completed' then null
      else error_message
    end
  where id = p_job_id
    and execution_instance_id = p_execution_instance_id;

  if not found then
    return false;
  end if;

  insert into public.build_job_status_events (
    job_id, project_id, from_status, to_status, worker_id, execution_instance_id, reason
  ) values (
    p_job_id,
    cur.project_id,
    cur.status,
    p_to_status,
    cur.claimed_by,
    p_execution_instance_id,
    p_reason
  );

  return true;
end;
$$;

revoke all on function public.claim_build_job_worker(uuid, text, text) from public;
grant execute on function public.claim_build_job_worker(uuid, text, text) to service_role, authenticated;

revoke all on function public.transition_build_job_status(uuid, text, text, text) from public;
grant execute on function public.transition_build_job_status(uuid, text, text, text) to service_role, authenticated;

notify pgrst, 'reload schema';
