-- ============================================================
-- DreamOS86 — Ensure public.profiles exists (fresh / broken projects)
--
-- Fixes PostgREST errors like:
--   "Could not find the table 'public.profiles' in the schema cache"
-- when the Supabase project was created without running earlier migrations.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- Minimal shell so ALTER ADD runs on completely empty projects
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null
);

-- Rename legacy foundational column if present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_complete'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_completed'
  ) then
    alter table public.profiles rename column onboarding_complete to onboarding_completed;
  end if;
end $$;

-- Columns expected by src/lib/supabase/types.ts and API upserts
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists plan_id text not null default 'free';
alter table public.profiles add column if not exists plan_interval text not null default 'monthly';
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.conname = 'profiles_plan_interval_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_interval_check
      check (plan_interval in ('monthly', 'yearly'));
  end if;
exception
  when check_violation then
    null;
end $$;
alter table public.profiles add column if not exists credits_remaining integer not null default 100;
alter table public.profiles add column if not exists credits_reset_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists default_model_id text not null default 'claude-3-5-sonnet';
alter table public.profiles add column if not exists use_case text;
alter table public.profiles add column if not exists experience_level text;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_ip text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_reason text;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id);
alter table public.profiles add column if not exists total_referrals integer not null default 0;
alter table public.profiles add column if not exists workspace_name text;
alter table public.profiles add column if not exists workspace_icon_url text;
alter table public.profiles add column if not exists workspace_description text;
alter table public.profiles add column if not exists onboarding_answers jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists signup_wizard_completed boolean not null default false;
alter table public.profiles add column if not exists signup_heard_about text;
alter table public.profiles add column if not exists signup_referral_code text;

-- plan_id must match app PlanId (text column may already exist from older migrations)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.conname = 'profiles_plan_id_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_id_check
      check (plan_id in ('free', 'pro', 'business', 'enterprise'));
  end if;
exception
  when check_violation then
    -- Existing bad data would prevent constraint; skip so migration still applies
    null;
end $$;

-- Helpful defaults for rows that survived partial schemas
update public.profiles
set
  credits_remaining = coalesce(nullif(credits_remaining, 0), 100),
  credits_reset_at = coalesce(credits_reset_at, created_at + interval '30 days')
where credits_reset_at is null;

-- Uniques (optional columns — ignore if duplicates exist)
do $$
begin
  alter table public.profiles add constraint profiles_username_key unique (username);
exception
  when duplicate_object then null;
  when unique_violation then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_referral_code_key unique (referral_code);
exception
  when duplicate_object then null;
  when unique_violation then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_stripe_customer_id_key unique (stripe_customer_id);
exception
  when duplicate_object then null;
  when unique_violation then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_stripe_subscription_id_key unique (stripe_subscription_id);
exception
  when duplicate_object then null;
  when unique_violation then null;
end $$;

-- updated_at helper
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auth → profile bootstrap (matches 004_fix_pass_2026.sql)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_username text;
  v_referral_code text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  v_username := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-z0-9]', '', 'g'));
  v_referral_code := upper(substring(md5(new.id::text) for 8));

  insert into public.profiles (
    id,
    email,
    full_name,
    username,
    avatar_url,
    plan_id,
    credits_remaining,
    credits_reset_at,
    referral_code,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(new.email, ''),
    v_full_name,
    nullif(v_username, ''),
    new.raw_user_meta_data->>'avatar_url',
    'free',
    100,
    now() + interval '30 days',
    v_referral_code,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS (anon cannot read; authenticated users own row; service role bypasses)
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Nudge API schema cache on hosted Supabase
notify pgrst, 'reload schema';
