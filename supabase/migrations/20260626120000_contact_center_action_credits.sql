-- Contact Center expansion + Action Credits runtime metering

-- ── contact_requests: align live + repo schemas ─────────────────────────────
alter table public.contact_requests add column if not exists name text;
alter table public.contact_requests add column if not exists company text;
alter table public.contact_requests add column if not exists kind text;
alter table public.contact_requests add column if not exists source text not null default 'platform_contact';
alter table public.contact_requests add column if not exists plan_interest text;
alter table public.contact_requests add column if not exists team_size text;
alter table public.contact_requests add column if not exists expected_usage text;
alter table public.contact_requests add column if not exists current_plan text;
alter table public.contact_requests add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.contact_requests add column if not exists app_slug text;
alter table public.contact_requests add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.contact_requests add column if not exists priority text not null default 'normal';
alter table public.contact_requests add column if not exists email_status text not null default 'pending';
alter table public.contact_requests add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.contact_requests add column if not exists updated_at timestamptz not null default now();

update public.contact_requests set name = coalesce(nullif(name, ''), split_part(email, '@', 1), 'Visitor') where name is null or name = '';
update public.contact_requests set source = coalesce(nullif(source, ''), 'platform_contact') where source is null or source = '';
update public.contact_requests set email_status = coalesce(nullif(email_status, ''), 'pending') where email_status is null or email_status = '';

alter table public.contact_requests alter column name set default 'Visitor';

alter table public.contact_requests drop constraint if exists contact_requests_status_check;
alter table public.contact_requests
  add constraint contact_requests_status_check
  check (status in ('new', 'open', 'read', 'replied', 'resolved', 'archived'));

alter table public.contact_requests drop constraint if exists contact_requests_priority_check;
alter table public.contact_requests
  add constraint contact_requests_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.contact_requests drop constraint if exists contact_requests_email_status_check;
alter table public.contact_requests
  add constraint contact_requests_email_status_check
  check (email_status in ('pending', 'sent', 'failed', 'skipped_no_config'));

update public.contact_requests set source = coalesce(nullif(source, ''), 'platform_contact') where source is null or source = '';
update public.contact_requests set source = 'legacy'
where source is not null
  and source not in (
    'platform_contact', 'generated_app_contact', 'support', 'sales',
    'bug_report', 'billing', 'abuse', 'contact_page', 'pricing_modal', 'legacy'
  );

alter table public.contact_requests drop constraint if exists contact_requests_source_check;
alter table public.contact_requests
  add constraint contact_requests_source_check
  check (source in (
    'platform_contact', 'generated_app_contact', 'support', 'sales',
    'bug_report', 'billing', 'abuse', 'contact_page', 'pricing_modal', 'legacy'
  ));

create index if not exists contact_requests_project_id_idx on public.contact_requests (project_id, created_at desc);
create index if not exists contact_requests_owner_user_id_idx on public.contact_requests (owner_user_id, created_at desc);
create index if not exists contact_requests_email_status_idx on public.contact_requests (email_status, created_at desc);
create index if not exists contact_requests_source_idx on public.contact_requests (source, created_at desc);

-- ── Action Credits ───────────────────────────────────────────────────────────
create table if not exists public.action_credit_balances (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, project_id)
);

create table if not exists public.action_credit_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  action_type text not null,
  provider text,
  provider_cost_usd numeric(12, 6),
  action_credits_charged numeric(12, 2) not null,
  multiplier_target numeric(6, 2) not null default 5,
  status text not null default 'completed',
  operation_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (operation_id)
);

create table if not exists public.runtime_action_usage_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  action_type text not null,
  provider text,
  provider_cost_usd numeric(12, 6),
  action_credits_charged numeric(12, 2) not null default 0,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists action_credit_events_owner_idx on public.action_credit_events (owner_user_id, created_at desc);
create index if not exists runtime_action_usage_logs_owner_idx on public.runtime_action_usage_logs (owner_user_id, created_at desc);
create index if not exists runtime_action_usage_logs_project_idx on public.runtime_action_usage_logs (project_id, created_at desc);

alter table public.action_credit_balances enable row level security;
alter table public.action_credit_events enable row level security;
alter table public.runtime_action_usage_logs enable row level security;

drop policy if exists "Owners read own action credit balances" on public.action_credit_balances;
create policy "Owners read own action credit balances"
  on public.action_credit_balances for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Owners read own action credit events" on public.action_credit_events;
create policy "Owners read own action credit events"
  on public.action_credit_events for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Owners read own runtime action logs" on public.runtime_action_usage_logs;
create policy "Owners read own runtime action logs"
  on public.runtime_action_usage_logs for select
  using (auth.uid() = owner_user_id);

-- Seed default balance on ensure_user_profile hook via RPC below

create or replace function public.ensure_action_credit_balance(
  p_owner_user_id uuid,
  p_project_id uuid default null,
  p_initial numeric default 50
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.action_credit_balances (owner_user_id, project_id, balance)
  values (p_owner_user_id, p_project_id, p_initial)
  on conflict (owner_user_id, project_id) do nothing;
end;
$$;

create or replace function public.charge_action_credits(
  p_owner_user_id uuid,
  p_project_id uuid,
  p_action_type text,
  p_credits numeric,
  p_operation_id text,
  p_provider text default null,
  p_provider_cost_usd numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_charged numeric;
begin
  if p_owner_user_id is null or p_operation_id is null or p_credits is null then
    return jsonb_build_object('success', false, 'error', 'invalid_args');
  end if;

  if exists (select 1 from public.action_credit_events where operation_id = p_operation_id) then
    select balance into v_balance from public.action_credit_balances
    where owner_user_id = p_owner_user_id and project_id is not distinct from p_project_id;
    return jsonb_build_object('success', true, 'charged', 0, 'remaining', coalesce(v_balance, 0), 'idempotent', true);
  end if;

  perform public.ensure_action_credit_balance(p_owner_user_id, p_project_id, 50);

  select balance into v_balance
  from public.action_credit_balances
  where owner_user_id = p_owner_user_id and project_id is not distinct from p_project_id
  for update;

  v_charged := round(greatest(p_credits, 0)::numeric, 2);

  if coalesce(v_balance, 0) < v_charged then
    return jsonb_build_object('success', false, 'error', 'insufficient_action_credits', 'remaining', coalesce(v_balance, 0));
  end if;

  update public.action_credit_balances
  set balance = balance - v_charged, updated_at = now()
  where owner_user_id = p_owner_user_id and project_id is not distinct from p_project_id;

  insert into public.action_credit_events (
    owner_user_id, project_id, action_type, provider, provider_cost_usd,
    action_credits_charged, multiplier_target, status, operation_id, metadata
  )
  values (
    p_owner_user_id, p_project_id, p_action_type, p_provider, p_provider_cost_usd,
    v_charged, 5, 'completed', p_operation_id, coalesce(p_metadata, '{}'::jsonb)
  );

  insert into public.runtime_action_usage_logs (
    owner_user_id, project_id, action_type, provider, provider_cost_usd,
    action_credits_charged, status, metadata
  )
  values (
    p_owner_user_id, p_project_id, p_action_type, p_provider, p_provider_cost_usd,
    v_charged, 'completed', coalesce(p_metadata, '{}'::jsonb)
  );

  select balance into v_balance
  from public.action_credit_balances
  where owner_user_id = p_owner_user_id and project_id is not distinct from p_project_id;

  return jsonb_build_object('success', true, 'charged', v_charged, 'remaining', coalesce(v_balance, 0));
end;
$$;

revoke execute on function public.charge_action_credits(uuid, uuid, text, numeric, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.charge_action_credits(uuid, uuid, text, numeric, text, text, numeric, jsonb) to service_role;

notify pgrst, 'reload schema';
