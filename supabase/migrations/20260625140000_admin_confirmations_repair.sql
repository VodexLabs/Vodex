-- Admin confirmations repair — grants + PostgREST visibility + runtime_diagnostics view
-- Safe to re-run (IF NOT EXISTS / OR REPLACE).

create table if not exists public.admin_pending_confirmations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  admin_email text,
  target_id uuid references public.profiles (id) on delete set null,
  action_type text not null,
  action_payload jsonb not null default '{}'::jsonb,
  otp_hash text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists admin_pending_confirmations_admin_created_idx
  on public.admin_pending_confirmations (admin_id, created_at desc);

create index if not exists admin_pending_confirmations_expires_idx
  on public.admin_pending_confirmations (expires_at);

alter table public.admin_pending_confirmations enable row level security;

create table if not exists public.dreamos_diagnostic_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null check (severity in ('debug', 'info', 'warn', 'error')),
  source text not null,
  category text not null default 'general',
  route text,
  component text,
  action text,
  message text not null,
  user_id uuid references public.profiles (id) on delete set null,
  project_id uuid,
  conversation_id uuid,
  build_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists dreamos_diagnostic_logs_created_idx
  on public.dreamos_diagnostic_logs (created_at desc);

alter table public.dreamos_diagnostic_logs enable row level security;

drop view if exists public.runtime_diagnostics;
create or replace view public.runtime_diagnostics as
  select * from public.dreamos_diagnostic_logs;

grant select on public.admin_pending_confirmations to service_role, authenticated, anon;
grant insert, update on public.admin_pending_confirmations to service_role;
grant select on public.dreamos_diagnostic_logs to service_role, authenticated, anon;
grant insert on public.dreamos_diagnostic_logs to service_role;
grant select on public.runtime_diagnostics to service_role, authenticated, anon;

notify pgrst, 'reload schema';
