-- Period-scoped explicit bonuses (reset each billing cycle) + 1500 cap on new grants.

create or replace function public._credit_period_start(p_reset_at timestamptz)
returns timestamptz
language sql
stable
as $$
  select case
    when p_reset_at is null then now() - interval '30 days'
    when p_reset_at <= now() then p_reset_at
    else p_reset_at - interval '1 month'
  end;
$$;

create or replace function public._explicit_build_bonus(p_user_id uuid)
returns numeric
language sql
stable
as $$
  select least(
    coalesce(
      (
        select sum(abs(tl.amount))
        from public.token_ledger tl
        inner join public.profiles p on p.id = tl.user_id
        where tl.user_id = p_user_id
          and tl.amount <> 0
          and tl.created_at >= public._credit_period_start(p.credits_reset_at)
          and (
            tl.source in ('admin_grant', 'referral', 'grant', 'purchase', 'top_up')
            or (
              tl.source = 'adjustment'
              and coalesce(tl.metadata->>'via', '') in ('grant_credits_admin', 'grant_credits')
            )
          )
      ),
      0
    ),
    1500::numeric
  );
$$;

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
  v_bonus numeric;
  v_headroom numeric;
begin
  perform public.require_dreamos_owner_session(p_admin_id);

  v_grant := round(greatest(p_amount, 0), 1);
  if v_grant < 0.1 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  v_bonus := public._explicit_build_bonus(p_user_id);
  v_headroom := greatest(0, 1500::numeric - v_bonus);
  if v_grant > v_headroom + 0.01 then
    v_grant := round(v_headroom, 1);
  end if;
  if v_grant < 0.1 then
    return jsonb_build_object(
      'success', false,
      'error', 'bonus_cap_reached',
      'cap', 1500,
      'current_bonus', v_bonus
    );
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

  return jsonb_build_object('success', true, 'remaining', round(v_remaining + v_grant, 1), 'granted', v_grant);
end;
$$;

notify pgrst, 'reload schema';
