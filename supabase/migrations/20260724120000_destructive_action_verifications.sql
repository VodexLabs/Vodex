-- P1.7.2 — Email verification for destructive actions (workspace / project delete)

create table if not exists public.destructive_action_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  action_type text not null,
  target_id uuid,
  otp_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  resend_count int not null default 0,
  last_sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists destructive_action_verifications_user_pending_idx
  on public.destructive_action_verifications (user_id, created_at desc)
  where consumed_at is null;

create index if not exists destructive_action_verifications_expires_idx
  on public.destructive_action_verifications (expires_at);

alter table public.destructive_action_verifications enable row level security;

-- Server-only via service role; no client policies.

comment on table public.destructive_action_verifications is
  'OTP confirmations for destructive workspace/project deletes (P1.7.2).';
