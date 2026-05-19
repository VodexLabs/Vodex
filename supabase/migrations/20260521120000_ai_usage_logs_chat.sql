-- AI usage audit trail + chat attachment column/policy (idempotent)

-- ─── ai_usage_logs (per-request billing / outcome; RLS: own rows only) ───────
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  model_id text not null,
  mode text not null default 'discuss',
  tokens_charged integer not null default 0,
  tokens_input integer,
  tokens_output integer,
  status text not null check (status in ('success', 'error')),
  error_message text,
  conversation_id uuid references public.conversations (id) on delete set null,
  operation_id text
);

create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

create index if not exists ai_usage_logs_status_idx
  on public.ai_usage_logs (status, created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "Users read own ai_usage_logs" on public.ai_usage_logs;
create policy "Users read own ai_usage_logs"
  on public.ai_usage_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own ai_usage_logs" on public.ai_usage_logs;
create policy "Users insert own ai_usage_logs"
  on public.ai_usage_logs for insert
  with check (auth.uid() = user_id);

-- ─── message_attachments: display name + link rows to messages after send ───
alter table public.message_attachments
  add column if not exists file_name text;

drop policy if exists "Users update own attachments" on public.message_attachments;
create policy "Users update own attachments"
  on public.message_attachments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
