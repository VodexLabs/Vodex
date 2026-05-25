-- Project build backlog — queued upgrades for staged first-pass builds
create table if not exists public.project_build_backlog (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'ui'
    check (category in ('ui','backend','auth','database','integration','analytics','polish','mobile','payments','deployment')),
  priority text not null default 'later'
    check (priority in ('now','next','later')),
  estimated_complexity smallint not null default 5 check (estimated_complexity between 1 and 10),
  estimated_credits numeric(10,2) not null default 12,
  status text not null default 'queued'
    check (status in ('queued','in_progress','completed','skipped')),
  source_prompt_excerpt text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (project_id, title)
);

create index if not exists project_build_backlog_project_status_idx
  on public.project_build_backlog (project_id, status, priority);

alter table public.project_build_backlog enable row level security;

create policy "Users read own project backlog"
  on public.project_build_backlog for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_build_backlog.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Users insert own project backlog"
  on public.project_build_backlog for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Users update own project backlog"
  on public.project_build_backlog for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_build_backlog.project_id
        and p.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
