-- P2.3 — Control Center status readiness + visual design columns + credit email automations
-- After apply: NOTIFY pgrst, 'reload schema';

-- Status / announcements (idempotent)
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

create table if not exists public.status_daily_history (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.status_components(id) on delete cascade,
  date date not null,
  status text not null default 'operational'
    check (status in ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  uptime_percent numeric(5,2) not null default 100,
  note text,
  created_at timestamptz not null default now(),
  unique (component_id, date)
);

create table if not exists public.status_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  status text not null default 'investigating'
    check (status in ('investigating', 'identified', 'monitoring', 'resolved')),
  severity text not null default 'incident',
  affected_components jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  is_public boolean not null default true,
  created_by uuid,
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
  add column if not exists background_preset text default 'gradient_default',
  add column if not exists effect_preset text default 'none',
  add column if not exists icon_preset text default 'megaphone',
  add column if not exists animated_icon_enabled boolean not null default false,
  add column if not exists accent_color text default '#ffffff',
  add column if not exists outline_color text,
  add column if not exists button_color text,
  add column if not exists dismissible boolean not null default true;

alter table public.admin_broadcasts
  add column if not exists background_preset text default 'soft_blue_white',
  add column if not exists effect_preset text default 'glow_pulse',
  add column if not exists icon_preset text default 'bell',
  add column if not exists animated_icon_enabled boolean not null default true,
  add column if not exists text_color text default '#0f172a',
  add column if not exists accent_color text default '#2563eb',
  add column if not exists outline_color text default '#bae6fd',
  add column if not exists target_plan text,
  add column if not exists target_email text;

create table if not exists public.email_automation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  automation_key text not null,
  credit_type text not null check (credit_type in ('build', 'action')),
  threshold int not null check (threshold in (80, 100)),
  cycle_key text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, automation_key, cycle_key)
);

create index if not exists email_automation_events_user_cycle_idx
  on public.email_automation_events (user_id, cycle_key desc);

alter table public.email_automation_events enable row level security;

insert into public.status_components (key, name, group_name, description, sort_order) values
  ('platform', 'Platform', 'Core Platform', 'Core Vodex web application', 110),
  ('login', 'Login / Authentication', 'Core Platform', 'Sign-in and sessions', 120),
  ('ai_builder', 'AI Builder', 'Builder', 'AI builder workspace', 210),
  ('preview_rendering', 'Preview Rendering', 'Builder', 'Live preview', 250),
  ('credits_usage', 'Credits / Usage', 'Billing', 'Credit metering', 430),
  ('email_resend', 'Email / Resend', 'Communications', 'Email delivery', 510),
  ('notifications', 'Notifications', 'Communications', 'In-app notifications', 520)
on conflict (key) do update set
  name = excluded.name,
  group_name = excluded.group_name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
