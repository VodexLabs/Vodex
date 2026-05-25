-- ============================================================
-- DreamOS86 — runtime schema contract repair (idempotent)
-- Fixes: app_files.mime_type, charge_tokens visibility, free plan credits
-- ============================================================

create extension if not exists "pgcrypto";

-- app_files import metadata (ZIP import / builder)
alter table public.app_files add column if not exists mime_type text default 'text/plain';
alter table public.app_files add column if not exists size_bytes bigint default 0;
alter table public.app_files add column if not exists source text default 'generated';
alter table public.app_files add column if not exists file_type text default 'file';
alter table public.app_files add column if not exists language text;
alter table public.app_files add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.app_files add column if not exists import_id uuid;
alter table public.app_files add column if not exists storage_path text;
alter table public.app_files add column if not exists encoding text;
alter table public.app_files add column if not exists content_hash text;
alter table public.app_files add column if not exists owner_id uuid references auth.users (id) on delete set null;

update public.app_files
set mime_type = coalesce(nullif(trim(mime_type), ''), 'text/plain')
where mime_type is null;

update public.app_files
set size_bytes = coalesce(octet_length(content), 0)
where size_bytes is null or size_bytes = 0;

update public.app_files
set source = coalesce(nullif(trim(source), ''), 'generated')
where source is null;

-- Free plan defaults: 30 credits (not legacy 100)
alter table public.profiles alter column credits_remaining set default 30;
alter table public.profiles alter column credits_limit set default 30;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'monthly_token_limit'
  ) then
    execute 'alter table public.profiles alter column monthly_token_limit set default 30';
  end if;
end $$;

-- Normalize stale free-tier seeds (100/100) only when no grant/purchase history
update public.profiles p
set
  credits_remaining = 30,
  credits_limit = 30,
  monthly_token_limit = coalesce(p.monthly_token_limit, 30),
  updated_at = now()
where coalesce(p.plan_id, 'free') = 'free'
  and p.credits_remaining = 100
  and coalesce(p.credits_limit, 100) = 100
  and not exists (
    select 1 from public.credit_events ce
    where ce.user_id = p.id
      and coalesce(ce.event_type, '') in ('grant', 'purchase', 'admin_grant')
  );

create index if not exists app_files_project_path_idx on public.app_files (project_id, path);
create index if not exists app_files_project_source_idx on public.app_files (project_id, source);

-- charge_tokens canonical signature (matches app PostgREST calls)
do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'charge_tokens'
  loop
    execute format('drop function if exists %I.%I(%s) cascade', r.nspname, r.proname, r.args);
  end loop;
end $$;

create or replace function public.charge_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text default null,
  p_project_id uuid default null,
  p_conversation_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_remaining integer;
  v_op text;
begin
  if p_user_id is null or p_amount is null or p_amount < 1 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  perform public.ensure_user_profile(p_user_id, null);

  v_op := coalesce(nullif(trim(p_idempotency_key), ''), 'charge:' || gen_random_uuid()::text);

  select credits_remaining into v_remaining
  from public.profiles where id = p_user_id for update;

  if v_remaining is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  if v_remaining < p_amount then
    return jsonb_build_object('success', false, 'error', 'insufficient_credits', 'remaining', v_remaining);
  end if;

  update public.profiles
  set credits_remaining = v_remaining - p_amount,
      credits_used = coalesce(credits_used, 0) + p_amount,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_events (
    user_id, operation_id, amount, balance_after, reason, project_id, conversation_id, metadata, event_type
  )
  values (
    p_user_id, v_op, -p_amount, v_remaining - p_amount,
    coalesce(p_reason, 'AI usage'),
    p_project_id, p_conversation_id, coalesce(p_metadata, '{}'::jsonb), 'generation'
  )
  on conflict do nothing;

  return jsonb_build_object('success', true, 'remaining', v_remaining - p_amount, 'operation_id', v_op);
end;
$$;

revoke all on function public.charge_tokens(uuid, integer, text, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.charge_tokens(uuid, integer, text, uuid, uuid, text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');
