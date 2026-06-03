-- P2.8 — Notifications realtime + announcement schema hardening
-- After apply: NOTIFY pgrst, 'reload schema';

-- Ensure notifications table can stream inserts to bell (Supabase Realtime)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
exception
  when others then
    null;
end $$;

alter table public.platform_announcements
  add column if not exists priority int not null default 100,
  add column if not exists banner_type text not null default 'info',
  add column if not exists gradient_from text,
  add column if not exists gradient_to text,
  add column if not exists text_color text default '#ffffff',
  add column if not exists icon_type text default 'alert',
  add column if not exists effect_key text default 'none',
  add column if not exists target_plan text,
  add column if not exists target_user_id uuid,
  add column if not exists target_email text,
  add column if not exists target_scope text default 'all',
  add column if not exists background_preset text default 'soft_blue_white',
  add column if not exists effect_preset text default 'none',
  add column if not exists icon_preset text default 'megaphone',
  add column if not exists animated_icon_enabled boolean not null default false,
  add column if not exists accent_color text default '#ffffff',
  add column if not exists outline_color text,
  add column if not exists button_color text,
  add column if not exists dismissible boolean not null default true;

NOTIFY pgrst, 'reload schema';
