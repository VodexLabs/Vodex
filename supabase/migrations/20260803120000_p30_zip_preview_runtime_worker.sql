-- P2.10 / P3.0 — ZIP import preview build jobs + artifact tracking
-- After apply: NOTIFY pgrst, 'reload schema';

create table if not exists public.preview_build_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  framework text,
  build_strategy text,
  artifact_path text,
  blocked_reason text,
  build_logs text,
  runtime_logs text,
  diagnostics jsonb not null default '{}'::jsonb,
  preview_renderable boolean not null default false,
  source_integrity_ok boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists preview_build_jobs_project_created_idx
  on public.preview_build_jobs (project_id, created_at desc);

create index if not exists preview_build_jobs_owner_status_idx
  on public.preview_build_jobs (owner_id, status);

alter table public.preview_build_jobs enable row level security;

drop policy if exists preview_build_jobs_owner_read on public.preview_build_jobs;
create policy preview_build_jobs_owner_read on public.preview_build_jobs
  for select using (auth.uid() = owner_id);

NOTIFY pgrst, 'reload schema';
