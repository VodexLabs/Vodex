-- Refund action credits when provider/upload fails after charge.

create or replace function public.refund_action_credits(
  p_owner_user_id uuid,
  p_project_id uuid,
  p_original_operation_id text,
  p_refund_operation_id text,
  p_reason text default 'refund'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.action_credit_events%rowtype;
  v_refunded numeric;
begin
  if p_owner_user_id is null or p_original_operation_id is null or p_refund_operation_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_args');
  end if;

  if exists (select 1 from public.action_credit_events where operation_id = p_refund_operation_id) then
    return jsonb_build_object('success', true, 'refunded', 0, 'idempotent', true);
  end if;

  select * into v_event
  from public.action_credit_events
  where operation_id = p_original_operation_id
    and owner_user_id = p_owner_user_id
    and status = 'completed'
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'original_charge_not_found');
  end if;

  v_refunded := coalesce(v_event.action_credits_charged, 0);
  if v_refunded <= 0 then
    return jsonb_build_object('success', true, 'refunded', 0);
  end if;

  update public.action_credit_events
  set status = 'refunded', metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('refund_reason', p_reason)
  where id = v_event.id;

  update public.action_credit_balances
  set balance = balance + v_refunded, updated_at = now()
  where owner_user_id = p_owner_user_id
    and project_id is not distinct from p_project_id;

  insert into public.action_credit_events (
    owner_user_id, project_id, action_type, provider, provider_cost_usd,
    action_credits_charged, multiplier_target, status, operation_id, metadata
  )
  values (
    v_event.owner_user_id, v_event.project_id, v_event.action_type || '_refund', v_event.provider, 0,
    -v_refunded, v_event.multiplier_target, 'refunded', p_refund_operation_id,
    jsonb_build_object('refund_of', p_original_operation_id, 'reason', p_reason)
  );

  return jsonb_build_object('success', true, 'refunded', v_refunded);
end;
$$;

revoke execute on function public.refund_action_credits(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.refund_action_credits(uuid, uuid, text, text, text) to service_role;

notify pgrst, 'reload schema';
