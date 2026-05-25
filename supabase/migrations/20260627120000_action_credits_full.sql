-- Full Action Credits: admin grants, workflows, project runtime settings

create table if not exists public.runtime_action_workflows (
  id uuid primary key default gen_random_uuid(),
  workflow_id text not null unique,
  project_id uuid references public.projects(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  app_user_id uuid,
  workflow_type text not null,
  status text not null default 'running',
  total_provider_cost_usd numeric(12, 6) default 0,
  total_action_credits_charged numeric(12, 2) default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists runtime_action_workflows_owner_idx
  on public.runtime_action_workflows (owner_user_id, started_at desc);

alter table public.projects add column if not exists runtime_settings jsonb not null default '{}'::jsonb;

create or replace function public.admin_add_action_credits(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.require_dreamos_owner_session(p_admin_id);
  if p_amount < 0.1 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;
  perform public.ensure_action_credit_balance(p_user_id, null, 25);
  update public.action_credit_balances
  set balance = balance + p_amount, updated_at = now()
  where owner_user_id = p_user_id and project_id is null;
  insert into public.action_credit_events (
    owner_user_id, project_id, action_type, provider, provider_cost_usd,
    action_credits_charged, multiplier_target, status, operation_id, metadata
  )
  values (
    p_user_id, null, 'admin_grant', 'admin', 0,
    -p_amount, 5, 'completed',
    'admin_action_grant:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('reason', p_reason, 'delta', p_amount)
  );
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_set_action_credits_balance(
  p_admin_id uuid,
  p_user_id uuid,
  p_balance numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_before numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);
  if p_balance < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_balance');
  end if;
  perform public.ensure_action_credit_balance(p_user_id, null, 25);
  select balance into v_before from public.action_credit_balances
  where owner_user_id = p_user_id and project_id is null for update;
  update public.action_credit_balances
  set balance = p_balance, updated_at = now()
  where owner_user_id = p_user_id and project_id is null;
  insert into public.action_credit_events (
    owner_user_id, project_id, action_type, provider, action_credits_charged,
    multiplier_target, status, operation_id, metadata
  )
  values (
    p_user_id, null, 'admin_set_balance', 'admin', 0,
    5, 'completed',
    'admin_action_set:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('reason', p_reason, 'before', coalesce(v_before, 0), 'after', p_balance)
  );
  return jsonb_build_object('success', true, 'before', coalesce(v_before, 0), 'after', p_balance);
end;
$$;

create or replace function public.admin_reset_action_credits_monthly(
  p_admin_id uuid,
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_plan text;
  v_quota numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);
  select plan_id into v_plan from public.profiles where id = p_user_id;
  v_quota := case coalesce(v_plan, 'free')
    when 'free' then 25
    when 'starter' then 500
    when 'pro' then 2000
    when 'business' then 5000
    when 'infinity' then 10000
    when 'enterprise' then 10000
    else 25
  end;
  perform public.ensure_action_credit_balance(p_user_id, null, v_quota);
  update public.action_credit_balances
  set balance = v_quota, updated_at = now()
  where owner_user_id = p_user_id and project_id is null;
  return jsonb_build_object('success', true, 'quota', v_quota);
end;
$$;

grant execute on function public.admin_add_action_credits(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.admin_set_action_credits_balance(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.admin_reset_action_credits_monthly(uuid, uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
