-- P0.6: grant_tokens must write credit_events.model_id (NOT NULL on remote).
create or replace function public.grant_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_source text default 'adjustment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
  v_op text;
  v_model text;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'user_id_required');
  end if;
  if p_amount < 1 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  v_op := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_model := nullif(trim(coalesce(p_metadata->>'model_id', '')), '');
  if v_model is null then
    v_model := 'system_refund';
  end if;

  perform public.ensure_user_profile(p_user_id, null);

  if v_op is not null and exists (
    select 1 from public.credit_events where operation_id = v_op
  ) then
    select credits_remaining into v_remaining from public.profiles where id = p_user_id;
    return jsonb_build_object('success', true, 'remaining', coalesce(v_remaining, 0), 'idempotent', true);
  end if;

  select credits_remaining into v_remaining
  from public.profiles where id = p_user_id for update;

  if v_remaining is null then
    return jsonb_build_object('success', false, 'error', 'profile_missing');
  end if;

  update public.profiles
  set credits_remaining = v_remaining + p_amount,
      credits_used = greatest(coalesce(credits_used, 0) - p_amount, 0),
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_events (
    user_id, operation_id, amount, balance_after, reason, metadata, event_type, model_id
  )
  values (
    p_user_id, v_op, p_amount, v_remaining + p_amount,
    coalesce(p_reason, 'Token grant'), coalesce(p_metadata, '{}'::jsonb), 'grant', v_model
  )
  on conflict do nothing;

  insert into public.token_ledger (
    user_id, amount, reason, source, metadata, idempotency_key
  )
  values (
    p_user_id, -p_amount, coalesce(p_reason, 'Token grant'),
    coalesce(p_source, 'adjustment'), coalesce(p_metadata, '{}'::jsonb), v_op
  )
  on conflict do nothing;

  return jsonb_build_object('success', true, 'remaining', v_remaining + p_amount);
end;
$$;

notify pgrst, 'reload schema';
