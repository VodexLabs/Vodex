-- P2.9 — Harden platform_announcements + status tables for PostgREST admin UI
-- After apply: NOTIFY pgrst, 'reload schema';

create table if not exists public.status_components (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  group_name text not null default 'Platform',
  description text,
  current_status text not null default 'operational'
    check (current_status in ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  sort_order int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  severity text not null default 'info',
  link_label text,
  link_url text,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists platform_announcements_active_priority_idx
  on public.platform_announcements (is_active, priority asc, starts_at desc nulls last);

NOTIFY pgrst, 'reload schema';
