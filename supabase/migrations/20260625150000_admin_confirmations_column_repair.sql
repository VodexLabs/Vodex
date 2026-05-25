-- Repair legacy admin_pending_confirmations / admin_audit_logs column shapes.
-- IF NOT EXISTS migrations left wrong columns (action vs action_type, code_hash vs otp_hash).

drop table if exists public.admin_pending_confirmations cascade;

create table public.admin_pending_confirmations (
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

create index admin_pending_confirmations_admin_created_idx
  on public.admin_pending_confirmations (admin_id, created_at desc);

create index admin_pending_confirmations_expires_idx
  on public.admin_pending_confirmations (expires_at);

alter table public.admin_pending_confirmations enable row level security;

drop table if exists public.admin_audit_logs cascade;

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.admin_pending_confirmations to service_role;
grant select on public.admin_pending_confirmations to authenticated, anon;
grant select, insert, update, delete on public.admin_audit_logs to service_role;
grant select on public.admin_audit_logs to authenticated, anon;

notify pgrst, 'reload schema';
