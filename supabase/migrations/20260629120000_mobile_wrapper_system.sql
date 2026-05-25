-- Mobile App Wrapper System — configs, builds, readiness, publish attempts

create table if not exists public.mobile_app_configs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  platforms text[] not null default '{}'::text[],
  wrapper_type text not null default 'capacitor'
    check (wrapper_type in ('capacitor', 'twa')),
  app_name text,
  short_name text,
  app_description text,
  package_id text,
  bundle_id text,
  theme_color text default '#6366f1',
  version_name text not null default '0.0.1',
  android_version_code int not null default 1 check (android_version_code >= 1),
  ios_build_number int not null default 1 check (ios_build_number >= 1),
  permissions jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  store_draft jsonb not null default '{}'::jsonb,
  icon_url text,
  splash_url text,
  readiness_android int,
  readiness_ios int,
  readiness_store int,
  meta jsonb not null default '{}'::jsonb,
  unique (project_id)
);

create index if not exists mobile_app_configs_owner_idx on public.mobile_app_configs (owner_id);

drop trigger if exists mobile_app_configs_updated_at on public.mobile_app_configs;
create trigger mobile_app_configs_updated_at
  before update on public.mobile_app_configs
  for each row execute function public.set_updated_at();

alter table public.mobile_app_configs enable row level security;
drop policy if exists "mobile_app_configs: own" on public.mobile_app_configs;
create policy "mobile_app_configs: own"
  on public.mobile_app_configs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists public.mobile_build_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  wrapper_type text not null default 'capacitor'
    check (wrapper_type in ('capacitor', 'twa')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'success', 'failed', 'cancelled', 'requires_builder_config')),
  artifact_type text check (artifact_type is null or artifact_type in ('apk', 'aab', 'ipa', 'xcarchive', 'zip', 'wrapper_zip')),
  version_name text,
  version_code int,
  artifact_url text,
  logs text,
  error_code text,
  error_message text,
  action_credits_charged numeric(10, 2) not null default 0,
  provider_cost_usd numeric(12, 6),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists mobile_build_jobs_project_idx on public.mobile_build_jobs (project_id, created_at desc);
create index if not exists mobile_build_jobs_owner_idx on public.mobile_build_jobs (owner_id, created_at desc);

drop trigger if exists mobile_build_jobs_updated_at on public.mobile_build_jobs;
create trigger mobile_build_jobs_updated_at
  before update on public.mobile_build_jobs
  for each row execute function public.set_updated_at();

alter table public.mobile_build_jobs enable row level security;
drop policy if exists "mobile_build_jobs: own" on public.mobile_build_jobs;
create policy "mobile_build_jobs: own"
  on public.mobile_build_jobs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists public.mobile_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('general', 'android', 'ios', 'store')),
  score int not null default 0 check (score >= 0 and score <= 100),
  items jsonb not null default '[]'::jsonb,
  action_credits_charged numeric(10, 2) not null default 0,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists mobile_readiness_checks_project_idx
  on public.mobile_readiness_checks (project_id, created_at desc);

alter table public.mobile_readiness_checks enable row level security;
drop policy if exists "mobile_readiness_checks: own" on public.mobile_readiness_checks;
create policy "mobile_readiness_checks: own"
  on public.mobile_readiness_checks for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists public.mobile_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'success', 'failed', 'manual_required', 'not_configured')),
  error_message text,
  action_credits_charged numeric(10, 2) not null default 0,
  provider_cost_usd numeric(12, 6),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists mobile_publish_attempts_project_idx
  on public.mobile_publish_attempts (project_id, created_at desc);

alter table public.mobile_publish_attempts enable row level security;
drop policy if exists "mobile_publish_attempts: own" on public.mobile_publish_attempts;
create policy "mobile_publish_attempts: own"
  on public.mobile_publish_attempts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
