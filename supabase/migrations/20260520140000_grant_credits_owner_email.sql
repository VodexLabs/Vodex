-- Allow platform owner email to grant tokens (in addition to is_admin).
-- Email is checked against auth.users for the caller id.

create or replace function public.grant_credits(
  p_admin_id    uuid,
  p_user_id     uuid,
  p_amount      int,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_admin boolean;
  v_email    text;
begin
  select coalesce(p.is_admin, false)
  into v_is_admin
  from public.profiles p
  where p.id = p_admin_id;

  select lower(trim(u.email::text))
  into v_email
  from auth.users u
  where u.id = p_admin_id;

  if not coalesce(v_is_admin, false)
     and coalesce(v_email, '') is distinct from 'dreamos86app@gmail.com' then
    return jsonb_build_object('success', false, 'error', 'not_admin');
  end if;

  update public.profiles
  set credits_remaining = credits_remaining + p_amount
  where id = p_user_id;

  insert into public.credit_events (user_id, operation_id, model_id, credits_consumed, event_type)
  values (p_user_id, 'admin_grant_' || gen_random_uuid()::text, 'admin', -p_amount, 'grant');

  insert into public.audit_logs (actor_id, target_id, action, details)
  values (p_admin_id, p_user_id, 'credit_grant', jsonb_build_object('amount', p_amount, 'reason', p_reason));

  return jsonb_build_object('success', true, 'error', null);
end;
$$;

grant execute on function public.grant_credits(uuid, uuid, int, text) to authenticated;

notify pgrst, 'reload schema';
