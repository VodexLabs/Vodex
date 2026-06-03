-- P2.7 — Discord account link + subscription role sync metadata
-- After apply: NOTIFY pgrst, 'reload schema';

alter table public.profiles
  add column if not exists discord_user_id text,
  add column if not exists discord_username text,
  add column if not exists discord_linked_at timestamptz,
  add column if not exists discord_role_sync_status text,
  add column if not exists discord_role_sync_error text,
  add column if not exists discord_role_synced_at timestamptz;

create index if not exists profiles_discord_user_id_idx
  on public.profiles (discord_user_id)
  where discord_user_id is not null;

alter table public.user_provider_connections
  drop constraint if exists user_provider_connections_provider_check;

alter table public.user_provider_connections
  add constraint user_provider_connections_provider_check
  check (provider in ('github', 'supabase', 'discord'));

NOTIFY pgrst, 'reload schema';
