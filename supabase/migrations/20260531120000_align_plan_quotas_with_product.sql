-- Align DB plan quotas with product truth (src/lib/billing/plans.ts)
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

-- Plan changes set allowance to canonical quota (no inflated carryover as fake bonus)
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
  v_quota int;
  v_before text;
  v_bonus int := 0;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  select plan_id into v_before from public.profiles where id = p_user_id;
  if v_before is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  v_quota := public._plan_monthly_quota(p_plan);

  select coalesce(sum(amount), 0)::int into v_bonus
  from public.token_ledger
  where user_id = p_user_id
    and amount > 0
    and source in ('admin_grant', 'referral', 'grant', 'purchase', 'top_up');

  update public.profiles
  set
    plan_id = p_plan,
    credits_remaining = v_quota + v_bonus,
    credits_reset_at = now() + interval '1 month',
    updated_at = now()
  where id = p_user_id;

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
  values (
    p_user_id,
    0,
    coalesce(p_reason, 'Plan change'),
    'plan_change',
    'plan_change:' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('plan', p_plan, 'quota', v_quota, 'before', v_before)
  );

  return jsonb_build_object('success', true, 'plan', p_plan, 'quota', v_quota, 'bonus', v_bonus);
end;
$$;
