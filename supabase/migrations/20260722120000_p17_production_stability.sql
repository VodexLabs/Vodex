-- P1.7 production stability: idempotent status + notifications + community grants
-- After apply: NOTIFY pgrst, 'reload schema';

-- ── Status tables (full idempotent) ─────────────────────────────────────────
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
  severity text not null default 'incident',
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
  add column if not exists banner_type text not null default 'incident',
  add column if not exists gradient_from text,
  add column if not exists gradient_to text,
  add column if not exists text_color text default '#ffffff',
  add column if not exists icon_type text default 'alert';

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'system',
  icon_type text default 'bell',
  action_label text,
  action_url text,
  play_sound boolean not null default true,
  target_scope text not null default 'all_existing',
  recipient_count int not null default 0,
  created_by uuid,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists status_daily_history_component_date_idx
  on public.status_daily_history (component_id, date desc);
create index if not exists status_incidents_public_started_idx
  on public.status_incidents (is_public, started_at desc);
create index if not exists platform_announcements_active_priority_idx
  on public.platform_announcements (is_active, priority asc, starts_at desc);

alter table public.status_components enable row level security;
alter table public.status_daily_history enable row level security;
alter table public.status_incidents enable row level security;
alter table public.platform_announcements enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.admin_broadcasts enable row level security;

drop policy if exists status_components_public_read on public.status_components;
create policy status_components_public_read on public.status_components
  for select using (is_public = true);

drop policy if exists status_daily_history_public_read on public.status_daily_history;
create policy status_daily_history_public_read on public.status_daily_history
  for select using (true);

drop policy if exists status_incidents_public_read on public.status_incidents;
create policy status_incidents_public_read on public.status_incidents
  for select using (is_public = true);

drop policy if exists platform_announcements_public_read on public.platform_announcements;
create policy platform_announcements_public_read on public.platform_announcements
  for select using (is_active = true);

drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed status components (P1.7 catalog)
insert into public.status_components (key, name, group_name, description, sort_order) values
  ('platform', 'Platform', 'Core Platform', 'Core Vodex web application', 110),
  ('login', 'Login / Authentication', 'Core Platform', 'Sign-in and sessions', 120),
  ('dashboard', 'Dashboard', 'Core Platform', 'Home dashboard', 130),
  ('admin_panel', 'Admin Panel', 'Core Platform', 'Owner admin', 140),
  ('ai_builder', 'AI Builder', 'Builder', 'AI builder workspace', 210),
  ('app_generation', 'App Generation', 'Builder', 'App generation pipeline', 220),
  ('build_queue', 'Build Queue', 'Builder', 'Queued builds', 230),
  ('edit_mode', 'Edit Mode', 'Builder', 'Surgical edits', 240),
  ('preview_rendering', 'Preview Rendering', 'Builder', 'Live preview', 250),
  ('code_export', 'Code Export', 'Builder', 'Export and deploy', 260),
  ('supabase', 'Database / Supabase', 'Infrastructure', 'Database and auth', 310),
  ('file_storage', 'File Storage', 'Infrastructure', 'Project files', 320),
  ('images_serving', 'Images Serving', 'Infrastructure', 'Media CDN', 330),
  ('vercel_hosting', 'Hosting / Vercel', 'Infrastructure', 'Production hosting', 340),
  ('published_apps', 'Published Applications', 'Infrastructure', 'Published apps', 350),
  ('paddle_checkout', 'Paddle Checkout', 'Billing', 'Checkout', 410),
  ('subscription_sync', 'Subscription Sync', 'Billing', 'Plan sync', 420),
  ('credits_usage', 'Credits / Usage', 'Billing', 'Credit metering', 430),
  ('upgrade_flow', 'Upgrade Flow', 'Billing', 'Upgrades', 440),
  ('email_resend', 'Email / Resend', 'Communications', 'Email delivery', 510),
  ('notifications', 'Notifications', 'Communications', 'In-app notifications', 520),
  ('discord_community', 'Discord Community', 'Communications', 'Community Discord', 530),
  ('openai', 'OpenAI', 'AI Services', 'OpenAI models', 610),
  ('anthropic', 'Anthropic', 'AI Services', 'Claude models', 620),
  ('google_gemini', 'Google Gemini', 'AI Services', 'Gemini models', 630),
  ('image_generation', 'Image Generation', 'AI Services', 'Image generation', 640)
on conflict (key) do update set
  name = excluded.name,
  group_name = excluded.group_name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Community: grants + policies (fix permission denied)
grant usage on schema public to anon, authenticated;
grant select on public.discussions to anon, authenticated;
grant insert, update, delete on public.discussions to authenticated;
grant select on public.discussion_replies to anon, authenticated;
grant insert, update on public.discussion_replies to authenticated;
grant select, insert, delete on public.discussion_likes to authenticated;

drop policy if exists "discussions: authenticated read" on public.discussions;
create policy "discussions: authenticated read"
  on public.discussions for select to authenticated, anon
  using (coalesce(is_deleted, false) = false);

notify pgrst, 'reload schema';
