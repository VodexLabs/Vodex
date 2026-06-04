-- P3.6 — status_incidents RLS + service grants + health snapshot table

alter table if exists public.status_incidents enable row level security;
alter table if exists public.status_components enable row level security;
alter table if exists public.status_daily_history enable row level security;

drop policy if exists "status_incidents_public_read" on public.status_incidents;
create policy "status_incidents_public_read"
  on public.status_incidents for select
  using (is_public = true);

drop policy if exists "status_components_public_read" on public.status_components;
create policy "status_components_public_read"
  on public.status_components for select
  using (is_public = true);

drop policy if exists "status_daily_history_public_read" on public.status_daily_history;
create policy "status_daily_history_public_read"
  on public.status_daily_history for select
  using (true);

grant select on public.status_incidents to anon, authenticated;
grant select on public.status_components to anon, authenticated;
grant select on public.status_daily_history to anon, authenticated;
grant all on public.status_incidents to service_role;
grant all on public.status_components to service_role;
grant all on public.status_daily_history to service_role;

create table if not exists public.status_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  overall_status text not null default 'operational',
  components jsonb not null default '[]'::jsonb,
  signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.status_health_snapshots enable row level security;

drop policy if exists "status_health_snapshots_public_read" on public.status_health_snapshots;
create policy "status_health_snapshots_public_read"
  on public.status_health_snapshots for select
  using (true);

grant select on public.status_health_snapshots to anon, authenticated;
grant all on public.status_health_snapshots to service_role;

notify pgrst, 'reload schema';
