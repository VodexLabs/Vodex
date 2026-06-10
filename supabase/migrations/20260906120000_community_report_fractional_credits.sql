-- community_report source + ensure fractional charge_tokens (Discuss 0.3 BC)

alter table public.contact_requests drop constraint if exists contact_requests_source_check;
alter table public.contact_requests
  add constraint contact_requests_source_check
  check (source in (
    'platform_contact', 'generated_app_contact', 'support', 'sales',
    'bug_report', 'billing', 'abuse', 'contact_page', 'pricing_modal',
    'community_report', 'legacy'
  ));

-- Re-assert numeric charge_tokens (idempotent if 20260628120000 already applied)
do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'charge_tokens'
      and pg_get_function_identity_arguments(p.oid) like '%integer%'
  loop
    execute format('drop function if exists %I.%I(%s) cascade', r.nspname, r.proname, r.args);
  end loop;
end $$;

create or replace function public.charge_tokens(
  p_user_id uuid,
  p_amount numeric,
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_project_id uuid default null,
  p_conversation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining numeric;
  v_op text;
  v_balance_after numeric;
begin
  v_op := nullif(trim(coalesce(p_idempotency_key, '')), '');
  perform public.ensure_user_profile(p_user_id, null);

  if v_op is not null and exists (select 1 from public.credit_events where operation_id = v_op) then
    select credits_remaining into v_remaining from public.profiles where id = p_user_id;
    return jsonb_build_object('ok', true, 'success', true, 'charged', false, 'idempotent', true,
      'balance_after', coalesce(v_remaining, 0), 'remaining', coalesce(v_remaining, 0));
  end if;

  if p_amount is null or p_amount <= 0 then
    select credits_remaining into v_remaining from public.profiles where id = p_user_id;
    return jsonb_build_object('ok', false, 'success', false, 'error', 'invalid_amount',
      'balance_after', coalesce(v_remaining, 0), 'remaining', coalesce(v_remaining, 0));
  end if;

  select credits_remaining into v_remaining from public.profiles where id = p_user_id for update;
  if v_remaining is null then
    return jsonb_build_object('ok', false, 'success', false, 'error', 'profile_missing', 'remaining', 0);
  end if;
  if v_remaining < p_amount then
    return jsonb_build_object('ok', false, 'success', false, 'error', 'insufficient_credits',
      'remaining', v_remaining, 'balance_after', v_remaining);
  end if;

  v_balance_after := round(v_remaining - p_amount, 1);
  update public.profiles set credits_remaining = v_balance_after, updated_at = now() where id = p_user_id;

  insert into public.credit_events (
    user_id, operation_id, credits_consumed, amount, balance_after, reason, status, metadata
  ) values (
    p_user_id, coalesce(v_op, gen_random_uuid()::text), p_amount, -p_amount, v_balance_after,
    coalesce(p_reason, 'AI charge'), 'finalized', coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object('ok', true, 'success', true, 'charged', true,
    'balance_after', v_balance_after, 'remaining', v_balance_after);
end;
$$;

revoke execute on function public.charge_tokens(uuid, numeric, text, text, jsonb, uuid, uuid) from public, anon;
grant execute on function public.charge_tokens(uuid, numeric, text, text, jsonb, uuid, uuid) to service_role;
