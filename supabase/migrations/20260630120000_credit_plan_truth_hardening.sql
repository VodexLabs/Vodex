-- Credit + plan truth: product quotas, preserve balance on plan change, positive grant ledger.

create or replace function public._plan_monthly_quota(p_plan text)
returns int
language sql
immutable
as $$
  select case coalesce(p_plan, 'free')
    when 'free' then 30
    when 'starter' then 200
    when 'pro' then 500
    when 'business' then 500
    when 'infinity' then 1000
    when 'enterprise' then 1000
    else 30
  end;
$$;

create or replace function public._explicit_build_bonus(p_user_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(abs(amount)), 0)
  from public.token_ledger
  where user_id = p_user_id
    and source in ('admin_grant', 'referral', 'grant', 'purchase', 'top_up');
$$;

-- Admin grants: positive ledger rows so bonus math matches profiles.credits_remaining
create or replace function public.grant_credits_admin(
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
declare
  v_op text;
  v_remaining numeric;
  v_grant numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  v_grant := round(greatest(p_amount, 0), 1);
  if v_grant < 0.1 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  perform public.ensure_user_profile(p_user_id, null);

  v_op := 'admin_grant:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text;

  select credits_remaining into v_remaining
  from public.profiles where id = p_user_id for update;

  if v_remaining is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  update public.profiles
  set credits_remaining = round(v_remaining + v_grant, 1), updated_at = now()
  where id = p_user_id;

  insert into public.credit_events (user_id, operation_id, amount, balance_after, reason, event_type, model_id)
  values (p_user_id, v_op, v_grant, round(v_remaining + v_grant, 1), coalesce(p_reason, 'Admin grant'), 'grant', 'admin');

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key)
  values (p_user_id, v_grant, coalesce(p_reason, 'Admin grant'), 'admin_grant', v_op);

  return jsonb_build_object('success', true, 'remaining', round(v_remaining + v_grant, 1));
end;
$$;

create or replace function public.admin_add_tokens(
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
  return public.grant_credits_admin(p_admin_id, p_user_id, p_amount, p_reason);
end;
$$;

create or replace function public.admin_set_token_balance(
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
  v_after numeric;
  v_delta numeric;
  v_op text;
  v_plan text;
  v_quota int;
  v_bonus numeric;
  v_cap numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  v_after := round(greatest(p_balance, 0), 1);

  select credits_remaining, plan_id into v_before, v_plan
  from public.profiles where id = p_user_id for update;

  if v_before is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  v_quota := public._plan_monthly_quota(v_plan);
  v_bonus := public._explicit_build_bonus(p_user_id);
  v_cap := v_quota + v_bonus;

  if v_after > v_cap + 0.01 then
    return jsonb_build_object(
      'success', false,
      'error', 'balance_exceeds_cap',
      'cap', v_cap,
      'plan_quota', v_quota,
      'bonus', v_bonus
    );
  end if;

  v_delta := v_after - v_before;
  v_op := 'admin_balance:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text;

  update public.profiles set credits_remaining = v_after, updated_at = now() where id = p_user_id;

  if abs(v_delta) >= 0.05 then
    insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
    values (
      p_user_id,
      v_delta,
      coalesce(p_reason, 'Balance adjustment'),
      'adjustment',
      v_op,
      jsonb_build_object('before', v_before, 'after', v_after, 'via', 'grant_credits_admin')
    );
  end if;

  return jsonb_build_object('success', true, 'before', v_before, 'after', v_after);
end;
$$;

-- Plan change: preserve remaining credits; only clamp if above new cap (upgrade keeps 200/1000)
create or replace function public.admin_set_plan(
  p_admin_id uuid,
  p_user_id uuid,
  p_plan text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_before_plan text;
  v_available numeric;
  v_quota int;
  v_bonus numeric;
  v_cap numeric;
  v_next numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  select plan_id, credits_remaining into v_before_plan, v_available
  from public.profiles where id = p_user_id for update;

  if v_before_plan is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  v_quota := public._plan_monthly_quota(p_plan);
  v_bonus := public._explicit_build_bonus(p_user_id);
  v_cap := v_quota + v_bonus;
  v_next := least(round(greatest(v_available, 0), 1), round(v_cap, 1));

  update public.profiles
  set
    plan_id = p_plan,
    credits_remaining = v_next,
    updated_at = now()
  where id = p_user_id;

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
  values (
    p_user_id,
    0,
    coalesce(p_reason, 'Plan change'),
    'plan_change',
    'plan_change:' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object(
      'plan', p_plan,
      'before_plan', v_before_plan,
      'quota', v_quota,
      'bonus', v_bonus,
      'before_available', v_available,
      'after_available', v_next
    )
  );

  return jsonb_build_object(
    'success', true,
    'plan', p_plan,
    'quota', v_quota,
    'bonus', v_bonus,
    'remaining', v_next
  );
end;
$$;

create or replace function public.admin_reset_monthly_tokens(
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
  v_quota int;
  v_bonus numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  select plan_id into v_plan from public.profiles where id = p_user_id;
  if v_plan is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  v_quota := public._plan_monthly_quota(v_plan);
  v_bonus := public._explicit_build_bonus(p_user_id);

  update public.profiles
  set
    credits_remaining = round(v_quota + v_bonus, 1),
    credits_reset_at = now() + interval '1 month',
    updated_at = now()
  where id = p_user_id;

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
  values (
    p_user_id,
    0,
    coalesce(p_reason, 'Monthly reset'),
    'monthly_reset',
    'monthly_reset:' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('plan', v_plan, 'quota', v_quota, 'bonus', v_bonus)
  );

  return jsonb_build_object('success', true, 'quota', v_quota, 'bonus', v_bonus);
end;
$$;

-- Action credits: round to one decimal; reject over-precision admin input
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
declare
  v_grant numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  v_grant := round(greatest(p_amount, 0), 1);
  if v_grant < 0.1 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  perform public.ensure_action_credit_balance(p_user_id, null, 25);
  update public.action_credit_balances
  set balance = round(balance + v_grant, 1), updated_at = now()
  where owner_user_id = p_user_id and project_id is null;

  insert into public.action_credit_events (
    owner_user_id, project_id, action_type, provider, provider_cost_usd,
    action_credits_charged, multiplier_target, status, operation_id, metadata
  )
  values (
    p_user_id, null, 'admin_grant', 'admin', 0,
    -v_grant, 5, 'completed',
    'admin_action_grant:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('reason', p_reason, 'delta', v_grant)
  );

  return jsonb_build_object('success', true, 'granted', v_grant);
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
  v_after numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  v_after := round(greatest(p_balance, 0), 1);

  perform public.ensure_action_credit_balance(p_user_id, null, 25);
  select balance into v_before from public.action_credit_balances
  where owner_user_id = p_user_id and project_id is null for update;

  update public.action_credit_balances
  set balance = v_after, updated_at = now()
  where owner_user_id = p_user_id and project_id is null;

  insert into public.action_credit_events (
    owner_user_id, project_id, action_type, provider, provider_cost_usd,
    action_credits_charged, multiplier_target, status, operation_id, metadata
  )
  values (
    p_user_id, null, 'admin_set_balance', 'admin', 0,
    round(v_before - v_after, 1), 5, 'completed',
    'admin_action_balance:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('reason', p_reason, 'before', v_before, 'after', v_after)
  );

  return jsonb_build_object('success', true, 'before', v_before, 'after', v_after);
end;
$$;
