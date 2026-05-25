-- Internal model routing audit trail — admin-only, never exposed to normal users.

create table if not exists public.model_decision_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  mode text not null,
  user_selected_model text,
  helper_model_used text,
  main_model_used text not null,
  provider_used text not null,
  fallback_provider text,
  fallback_reason text,
  estimated_cost_bucket text check (estimated_cost_bucket in ('micro', 'low', 'medium', 'high')),
  input_tokens integer,
  output_tokens integer,
  actual_cost_usd numeric(12, 8),
  latency_ms integer,
  status text not null default 'success' check (status in ('success', 'error'))
);

create index if not exists model_decision_logs_created_idx
  on public.model_decision_logs (created_at desc);

create index if not exists model_decision_logs_user_created_idx
  on public.model_decision_logs (user_id, created_at desc);

create index if not exists model_decision_logs_operation_idx
  on public.model_decision_logs (operation_id);

alter table public.model_decision_logs enable row level security;

-- No user-facing policies — service role inserts; admin reads via service role API only.

notify pgrst, 'reload schema';
