-- Harden admin RPCs: caller must match p_admin_id and be platform owner.
-- Protect profile billing/admin columns from direct client tampering.
-- Compatible with live schema (plan_id text, no record_token_ledger).

alter table public.profiles add column if not exists suspended_at timestamptz;

create or replace function public.require_dreamos_owner_session(p_admin_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_role text;
begin
  v_uid := auth.uid();
  v_role := coalesce(
    current_setting('request.jwt.claim.role', true),
    auth.jwt() ->> 'role'
  );

  if v_role = 'service_role' then
    return;
  end if;

  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if v_uid is distinct from p_admin_id then
    raise exception 'forbidden_admin_impersonation' using errcode = '42501';
  end if;

  if not public.is_dreamos_owner(p_admin_id) then
    raise exception 'forbidden_not_owner' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.grant_credits_admin(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount integer,
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
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  if p_amount < 1 then
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
  set credits_remaining = v_remaining + p_amount, updated_at = now()
  where id = p_user_id;

  insert into public.credit_events (user_id, operation_id, amount, balance_after, reason, event_type, model_id)
  values (p_user_id, v_op, p_amount, v_remaining + p_amount, coalesce(p_reason, 'Admin grant'), 'grant', 'admin');

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key)
  values (p_user_id, -p_amount, coalesce(p_reason, 'Admin grant'), 'admin_grant', v_op);

  return jsonb_build_object('success', true, 'remaining', v_remaining + p_amount);
end;
$$;

create or replace function public.grant_credits(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount int,
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

create or replace function public.admin_add_tokens(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount int,
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
  p_balance int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_before numeric;
  v_delta numeric;
  v_op text;
begin
  perform public.require_dreamos_owner_session(p_admin_id);
  if p_balance < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_balance');
  end if;

  select credits_remaining into v_before from public.profiles where id = p_user_id for update;
  if v_before is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  v_delta := p_balance - v_before;
  v_op := 'admin_balance:' || p_admin_id::text || ':' || p_user_id::text || ':' || gen_random_uuid()::text;

  update public.profiles set credits_remaining = p_balance, updated_at = now() where id = p_user_id;

  if v_delta <> 0 then
    insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
    values (
      p_user_id,
      v_delta::int,
      coalesce(p_reason, 'Balance adjustment'),
      'adjustment',
      v_op,
      jsonb_build_object('before', v_before, 'after', p_balance)
    );
  end if;

  return jsonb_build_object('success', true, 'before', v_before, 'after', p_balance);
end;
$$;

create or replace function public._plan_monthly_quota(p_plan text)
returns int
language sql
immutable
as $$
  select case coalesce(p_plan, 'free')
    when 'free' then 30
    when 'starter' then 500
    when 'pro' then 2000
    when 'business' then 10000
    when 'infinity' then 100000
    when 'enterprise' then 100000
    else 30
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
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  select plan_id into v_plan from public.profiles where id = p_user_id;
  if v_plan is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  v_quota := public._plan_monthly_quota(v_plan);

  update public.profiles
  set credits_remaining = v_quota, credits_reset_at = now() + interval '1 month', updated_at = now()
  where id = p_user_id;

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
  values (
    p_user_id,
    0,
    coalesce(p_reason, 'Monthly reset'),
    'monthly_reset',
    'monthly_reset:' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('plan', v_plan, 'quota', v_quota)
  );

  return jsonb_build_object('success', true, 'quota', v_quota);
end;
$$;

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
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  v_quota := public._plan_monthly_quota(p_plan);

  update public.profiles
  set plan_id = p_plan, credits_remaining = v_quota, credits_reset_at = now() + interval '1 month', updated_at = now()
  where id = p_user_id;

  insert into public.token_ledger (user_id, amount, reason, source, idempotency_key, metadata)
  values (
    p_user_id,
    0,
    coalesce(p_reason, 'Plan change'),
    'adjustment',
    'plan_change:' || p_user_id::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('plan', p_plan, 'quota', v_quota)
  );

  return jsonb_build_object('success', true, 'plan', p_plan, 'quota', v_quota);
end;
$$;

create or replace function public.admin_set_suspended(
  p_admin_id uuid,
  p_user_id uuid,
  p_suspended boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  update public.profiles
  set suspended_at = case when p_suspended then now() else null end, updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true, 'suspended', p_suspended);
end;
$$;

create or replace function public.profiles_protect_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(
    current_setting('request.jwt.claim.role', true),
    auth.jwt() ->> 'role'
  );

  if jwt_role in ('service_role', 'supabase_admin') or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if auth.uid() is null or auth.uid() is distinct from old.id then
    return new;
  end if;

  new.credits_remaining := old.credits_remaining;
  new.plan_id := old.plan_id;
  new.is_admin := old.is_admin;
  new.credits_limit := old.credits_limit;
  new.credits_used := old.credits_used;
  new.credits_reset_at := old.credits_reset_at;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.suspended_at := old.suspended_at;

  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;
create trigger profiles_protect_sensitive_fields
  before update on public.profiles
  for each row
  execute function public.profiles_protect_sensitive_fields();

revoke execute on function public.admin_add_tokens(uuid, uuid, int, text) from public, anon;
revoke execute on function public.admin_set_token_balance(uuid, uuid, int, text) from public, anon;
revoke execute on function public.admin_reset_monthly_tokens(uuid, uuid, text) from public, anon;
revoke execute on function public.admin_set_plan(uuid, uuid, text, text) from public, anon;
revoke execute on function public.admin_set_suspended(uuid, uuid, boolean, text) from public, anon;
revoke execute on function public.grant_credits(uuid, uuid, int, text) from public, anon;
revoke execute on function public.grant_credits_admin(uuid, uuid, integer, text) from public, anon;

grant execute on function public.admin_add_tokens(uuid, uuid, int, text) to authenticated, service_role;
grant execute on function public.admin_set_token_balance(uuid, uuid, int, text) to authenticated, service_role;
grant execute on function public.admin_reset_monthly_tokens(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.admin_set_plan(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_set_suspended(uuid, uuid, boolean, text) to authenticated, service_role;
grant execute on function public.grant_credits(uuid, uuid, int, text) to authenticated, service_role;
grant execute on function public.grant_credits_admin(uuid, uuid, integer, text) to service_role;

notify pgrst, 'reload schema';
