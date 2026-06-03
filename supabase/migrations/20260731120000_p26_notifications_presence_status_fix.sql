-- P2.6 — Welcome notification backfill, presence reliability, status schema hardening
-- After apply: NOTIFY pgrst, 'reload schema';

-- Ensure presence columns exist (idempotent)
alter table public.profiles
  add column if not exists presence_mode text not null default 'auto'
    check (presence_mode in ('auto', 'online', 'offline', 'invisible'));

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  current_status text not null default 'online',
  updated_at timestamptz not null default now()
);

-- One-time idempotent welcome inbox backfill for existing users
create or replace function public.backfill_welcome_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.notifications (user_id, type, title, body, read, action_url, metadata)
  select
    p.id,
    'system',
    case
      when coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), '')) is not null then
        'Welcome to Vodex, ' || split_part(coalesce(p.display_name, p.full_name), ' ', 1) || '!'
      else
        'Welcome to Vodex!'
    end,
    'Welcome to Vodex — we added free credits so you can start building your first app.',
    false,
    '/create',
    jsonb_build_object(
      'kind', 'welcome',
      'premium', true,
      'free_credits', true,
      'icon_key', 'vodex_welcome',
      'effect_key', 'glow_pulse',
      'play_sound', true
    )
  from public.profiles p
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = p.id
      and n.type = 'system'
      and n.title ilike 'Welcome to Vodex%'
  );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Run backfill once during migration apply
select public.backfill_welcome_notifications();

NOTIFY pgrst, 'reload schema';
