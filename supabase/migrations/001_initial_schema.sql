-- ============================================================
-- DreamOS86 — Initial Schema Migration
-- Run this in your Supabase SQL Editor or via CLI:
--   supabase db push
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_stat_statements";

-- ── Enums ────────────────────────────────────────────────────────────────────

create type plan_id as enum (
  'free', 'pro', 'business', 'enterprise'
);

create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'
);

create type project_status as enum (
  'live', 'staging', 'draft', 'building', 'error'
);

create type deployment_status as enum (
  'queued', 'building', 'deployed', 'failed', 'cancelled'
);

create type team_role as enum (
  'owner', 'admin', 'editor', 'viewer'
);

create type member_status as enum (
  'active', 'pending', 'removed'
);

create type notification_type as enum (
  'deploy', 'build', 'invite', 'credit', 'system', 'ai'
);

create type asset_type as enum (
  'image', 'icon', 'screenshot', 'video', 'document'
);

create type ticket_status as enum (
  'open', 'in_progress', 'resolved', 'closed'
);

create type audit_action as enum (
  'credit_grant', 'credit_revoke', 'user_suspend', 'user_reinstate',
  'plan_change', 'api_key_create', 'api_key_revoke', 'deployment',
  'invite_send', 'invite_accept', 'referral_complete', 'admin_action',
  'billing_event', 'auth_event'
);

-- ── Profiles ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  email                 text not null,
  full_name             text,
  username              text unique,
  avatar_url            text,
  plan_id               plan_id not null default 'free',
  plan_interval         text not null default 'monthly' check (plan_interval in ('monthly', 'yearly')),
  credits_remaining     int not null default 0,
  credits_reset_at      timestamptz not null default (now() + interval '1 month'),
  onboarding_completed  boolean not null default false,
  onboarding_completed_at timestamptz,
  default_model_id      text not null default 'claude-3-5-sonnet',
  use_case              text,
  experience_level      text,
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  email_verified        boolean not null default false,
  terms_accepted_at     timestamptz,
  terms_version         text,
  terms_accepted_ip     text,
  is_admin              boolean not null default false,
  suspended_at          timestamptz,
  suspended_reason      text,
  referral_code         text unique default encode(gen_random_bytes(6), 'hex'),
  referred_by           uuid references public.profiles(id),
  total_referrals       int not null default 0
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Workspaces ───────────────────────────────────────────────────────────────

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  slug        text not null unique,
  avatar_url  text,
  plan_id     plan_id not null default 'free'
);

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.handle_updated_at();

-- Auto-create personal workspace on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
declare
  ws_slug text;
begin
  ws_slug := lower(regexp_replace(coalesce(new.full_name, split_part(new.email, '@', 1)), '[^a-z0-9]', '-', 'g'));
  ws_slug := ws_slug || '-' || substring(new.id::text, 1, 8);
  insert into public.workspaces (owner_id, name, slug)
  values (new.id, coalesce(new.full_name, split_part(new.email, '@', 1)) || '''s Workspace', ws_slug);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ── Team Members ─────────────────────────────────────────────────────────────

create table public.team_members (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  email           text not null,
  role            team_role not null default 'viewer',
  invited_by      uuid not null references public.profiles(id),
  status          member_status not null default 'pending',
  invite_token    text unique default encode(gen_random_bytes(20), 'hex'),
  invite_expires_at timestamptz default (now() + interval '7 days'),
  accepted_at     timestamptz
);

-- ── Subscriptions ────────────────────────────────────────────────────────────

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id  text not null unique,
  stripe_customer_id      text not null,
  stripe_price_id         text not null,
  plan_id                 plan_id not null,
  plan_interval           text not null check (plan_interval in ('monthly', 'yearly')),
  credits_per_period      int not null,
  status                  subscription_status not null default 'active',
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,
  canceled_at             timestamptz,
  trial_end               timestamptz
);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- ── Credit Events (Ledger — append-only) ─────────────────────────────────────

create table public.credit_events (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  project_id          uuid,
  conversation_id     uuid,
  operation_id        text not null,
  model_id            text not null default 'unknown',
  credits_consumed    int not null,
  internal_cost_usd   numeric(10, 6) not null default 0,
  event_type          text not null default 'generation' check (event_type in ('generation', 'upload', 'deploy', 'grant', 'reset', 'refund')),
  metadata            jsonb not null default '{}'
);

-- Prevent updates/deletes on credit ledger (immutable)
create or replace rule credit_events_no_update as on update to public.credit_events do instead nothing;
create or replace rule credit_events_no_delete as on delete to public.credit_events do instead nothing;

-- ── Conversations ─────────────────────────────────────────────────────────────

create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'New Conversation',
  model_id    text not null default 'claude-3-5-sonnet',
  pinned      boolean not null default false,
  archived    boolean not null default false,
  message_count int not null default 0,
  last_message_at timestamptz
);

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

-- ── Messages ─────────────────────────────────────────────────────────────────

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  model_id        text,
  credits_used    int not null default 0,
  finish_reason   text,
  tokens_input    int,
  tokens_output   int,
  attachments     jsonb not null default '[]',
  metadata        jsonb not null default '{}'
);

-- Update conversation stats on new message
create or replace function public.update_conversation_on_message()
returns trigger as $$
begin
  update public.conversations
  set
    message_count = message_count + 1,
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.update_conversation_on_message();

-- ── Projects ─────────────────────────────────────────────────────────────────

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  workspace_id    uuid references public.workspaces(id) on delete set null,
  name            text not null,
  description     text,
  slug            text not null,
  status          project_status not null default 'draft',
  framework       text not null default 'nextjs',
  template_id     uuid,
  gradient        text not null default 'from-violet-500 to-purple-600',
  icon_url        text,
  preview_url     text,
  custom_domain   text,
  is_public       boolean not null default false,
  is_favorite     boolean not null default false,
  category        text,
  remix_of        uuid references public.projects(id),
  remix_count     int not null default 0,
  launch_count    int not null default 0,
  metadata        jsonb not null default '{}',
  unique (owner_id, slug)
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- ── Templates ────────────────────────────────────────────────────────────────

create table public.templates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  description     text not null,
  category        text not null,
  gradient        text not null,
  accent          text not null default '#6366f1',
  tags            text[] not null default '{}',
  complexity      text not null check (complexity in ('simple', 'medium', 'advanced')),
  popular         boolean not null default false,
  is_new          boolean not null default false,
  prompt          text not null,
  preview_url     text,
  uses_count      int not null default 0,
  plan_required   plan_id
);

-- ── Deployments ──────────────────────────────────────────────────────────────

create table public.deployments (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  status            deployment_status not null default 'queued',
  environment       text not null check (environment in ('production', 'staging', 'preview')),
  url               text,
  build_duration_ms int,
  commit_message    text,
  error_message     text,
  metadata          jsonb not null default '{}'
);

-- ── Media Assets ─────────────────────────────────────────────────────────────

create table public.media_assets (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,
  filename            text not null,
  storage_path        text not null,
  public_url          text not null,
  mime_type           text not null,
  size_bytes          bigint not null,
  width               int,
  height              int,
  asset_type          asset_type not null default 'image',
  generated           boolean not null default false,
  generation_prompt   text,
  tags                text[] not null default '{}'
);

-- ── API Keys ─────────────────────────────────────────────────────────────────

create table public.api_keys (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  key_hash        text not null unique,
  key_prefix      text not null,
  scopes          text[] not null default '{read}',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  request_count   bigint not null default 0
);

-- ── Analytics Events ─────────────────────────────────────────────────────────

create table public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event_type  text not null,
  properties  jsonb not null default '{}',
  session_id  text,
  ip          text
);

-- Partition by month for performance (optional — add if needed at scale)

-- ── Notifications ────────────────────────────────────────────────────────────

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text not null,
  read        boolean not null default false,
  action_url  text,
  metadata    jsonb not null default '{}'
);

-- ── User Settings ─────────────────────────────────────────────────────────────

create table public.user_settings (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  updated_at          timestamptz not null default now(),
  theme               text not null default 'system' check (theme in ('system', 'dark', 'light')),
  default_model_id    text not null default 'claude-3-5-sonnet',
  notification_prefs  jsonb not null default '{"deploy": true, "billing": true, "credits": true, "system": true, "marketing": false}',
  editor_prefs        jsonb not null default '{}',
  billing_alerts      boolean not null default true,
  marketing_emails    boolean not null default false
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

-- Auto-create user_settings on profile creation
create or replace function public.handle_new_profile_settings()
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute function public.handle_new_profile_settings();

-- ── Support Tickets ───────────────────────────────────────────────────────────

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject     text not null,
  body        text not null,
  status      ticket_status not null default 'open',
  category    text not null default 'general',
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  attachments jsonb not null default '[]',
  admin_note  text,
  resolved_at timestamptz
);

create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.handle_updated_at();

create table public.ticket_replies (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  is_staff    boolean not null default false,
  attachments jsonb not null default '[]'
);

-- ── Onboarding ────────────────────────────────────────────────────────────────

create table public.onboarding (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  workspace_name    text,
  use_case          text,
  experience_level  text,
  preferred_model   text,
  referral_source   text,
  answers           jsonb not null default '{}'
);

-- ── Referrals ─────────────────────────────────────────────────────────────────

create table public.referrals (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  referrer_id     uuid not null references public.profiles(id) on delete cascade,
  referred_email  text not null,
  referred_id     uuid references public.profiles(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'completed', 'invalid')),
  completed_at    timestamptz,
  credits_granted int not null default 0,
  unique (referrer_id, referred_email)
);

-- ── Billing Events ────────────────────────────────────────────────────────────

create table public.billing_events (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  user_id               uuid references public.profiles(id) on delete set null,
  stripe_event_id       text not null unique,
  event_type            text not null,
  amount_usd            numeric(10, 2),
  currency              text default 'usd',
  stripe_customer_id    text,
  stripe_subscription_id text,
  metadata              jsonb not null default '{}'
);

-- ── Audit Logs (immutable) ────────────────────────────────────────────────────

create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_id    uuid references public.profiles(id) on delete set null,
  target_id   uuid,
  action      audit_action not null,
  details     jsonb not null default '{}',
  ip          text,
  user_agent  text
);

-- Immutable audit log — no updates or deletes
create or replace rule audit_logs_no_update as on update to public.audit_logs do instead nothing;
create or replace rule audit_logs_no_delete as on delete to public.audit_logs do instead nothing;

-- ── Admin Actions ─────────────────────────────────────────────────────────────

create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  admin_id    uuid not null references public.profiles(id) on delete cascade,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  amount      int,
  reason      text,
  otp_verified boolean not null default false,
  metadata    jsonb not null default '{}'
);

-- ── RPC Functions ─────────────────────────────────────────────────────────────

-- Atomically consume credits
create or replace function public.consume_credits(
  p_user_id       uuid,
  p_amount        int,
  p_operation_id  text,
  p_model_id      text,
  p_project_id    uuid default null,
  p_conversation_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_remaining int;
begin
  -- Lock the profile row for update
  select credits_remaining into v_remaining
  from public.profiles
  where id = p_user_id
  for update;

  if v_remaining < p_amount then
    return jsonb_build_object('success', false, 'remaining', v_remaining, 'error', 'insufficient_credits');
  end if;

  -- Deduct credits
  update public.profiles
  set credits_remaining = credits_remaining - p_amount
  where id = p_user_id;

  -- Append to ledger
  insert into public.credit_events (user_id, project_id, conversation_id, operation_id, model_id, credits_consumed, event_type)
  values (p_user_id, p_project_id, p_conversation_id, p_operation_id, p_model_id, p_amount, 'generation');

  return jsonb_build_object('success', true, 'remaining', v_remaining - p_amount, 'error', null);
end;
$$;

-- Grant credits (admin only)
create or replace function public.grant_credits(
  p_admin_id    uuid,
  p_user_id     uuid,
  p_amount      int,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin_id;
  if not v_is_admin then
    return jsonb_build_object('success', false, 'error', 'not_admin');
  end if;

  update public.profiles
  set credits_remaining = credits_remaining + p_amount
  where id = p_user_id;

  insert into public.credit_events (user_id, operation_id, model_id, credits_consumed, event_type)
  values (p_user_id, 'admin_grant_' || p_admin_id, 'admin', -p_amount, 'grant');

  insert into public.audit_logs (actor_id, target_id, action, details)
  values (p_admin_id, p_user_id, 'credit_grant', jsonb_build_object('amount', p_amount, 'reason', p_reason));

  return jsonb_build_object('success', true, 'error', null);
end;
$$;

-- Get credit summary
create or replace function public.get_user_credit_summary(p_user_id uuid)
returns jsonb
language sql
security definer
as $$
  select jsonb_build_object(
    'total_used', coalesce(sum(credits_consumed) filter (where event_type = 'generation'), 0),
    'total_granted', coalesce(sum(-credits_consumed) filter (where event_type = 'grant'), 0),
    'remaining', (select credits_remaining from public.profiles where id = p_user_id),
    'reset_at', (select credits_reset_at from public.profiles where id = p_user_id)
  )
  from public.credit_events
  where user_id = p_user_id
    and created_at >= date_trunc('month', now());
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.team_members      enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.credit_events     enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.projects          enable row level security;
alter table public.templates         enable row level security;
alter table public.deployments       enable row level security;
alter table public.media_assets      enable row level security;
alter table public.api_keys          enable row level security;
alter table public.analytics_events  enable row level security;
alter table public.notifications     enable row level security;
alter table public.user_settings     enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.ticket_replies    enable row level security;
alter table public.onboarding        enable row level security;
alter table public.referrals         enable row level security;
alter table public.billing_events    enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.admin_actions     enable row level security;

-- Profiles
create policy "profiles: users see own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: users update own"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles: admins see all"
  on public.profiles for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Workspaces
create policy "workspaces: owner full access"
  on public.workspaces for all using (owner_id = auth.uid());
create policy "workspaces: members read"
  on public.workspaces for select using (
    exists (select 1 from public.team_members tm where tm.workspace_id = id and tm.user_id = auth.uid() and tm.status = 'active')
  );

-- Team members
create policy "team_members: workspace owner full access"
  on public.team_members for all using (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );
create policy "team_members: own record read"
  on public.team_members for select using (user_id = auth.uid());

-- Subscriptions
create policy "subscriptions: own only"
  on public.subscriptions for all using (user_id = auth.uid());

-- Credit events
create policy "credit_events: own read"
  on public.credit_events for select using (user_id = auth.uid());
create policy "credit_events: own insert"
  on public.credit_events for insert with check (user_id = auth.uid());

-- Conversations
create policy "conversations: own only"
  on public.conversations for all using (user_id = auth.uid());

-- Messages
create policy "messages: own only"
  on public.messages for all using (user_id = auth.uid());

-- Projects
create policy "projects: own full access"
  on public.projects for all using (owner_id = auth.uid());
create policy "projects: public read"
  on public.projects for select using (is_public = true);

-- Templates (public read)
create policy "templates: public read"
  on public.templates for select using (true);
create policy "templates: admin write"
  on public.templates for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Deployments
create policy "deployments: own only"
  on public.deployments for all using (user_id = auth.uid());

-- Media assets
create policy "media_assets: own only"
  on public.media_assets for all using (user_id = auth.uid());

-- API keys
create policy "api_keys: own only"
  on public.api_keys for all using (user_id = auth.uid());

-- Analytics events
create policy "analytics_events: own insert"
  on public.analytics_events for insert with check (user_id = auth.uid());
create policy "analytics_events: own read"
  on public.analytics_events for select using (user_id = auth.uid());

-- Notifications
create policy "notifications: own only"
  on public.notifications for all using (user_id = auth.uid());

-- User settings
create policy "user_settings: own only"
  on public.user_settings for all using (user_id = auth.uid());

-- Support tickets
create policy "support_tickets: own only"
  on public.support_tickets for all using (user_id = auth.uid());
create policy "support_tickets: admin read all"
  on public.support_tickets for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Ticket replies
create policy "ticket_replies: own ticket"
  on public.ticket_replies for all using (
    exists (select 1 from public.support_tickets st where st.id = ticket_id and st.user_id = auth.uid())
  );

-- Onboarding
create policy "onboarding: own only"
  on public.onboarding for all using (user_id = auth.uid());

-- Referrals
create policy "referrals: own only"
  on public.referrals for all using (referrer_id = auth.uid());

-- Billing events (read-only for users)
create policy "billing_events: own read"
  on public.billing_events for select using (user_id = auth.uid());

-- Audit logs (admin only)
create policy "audit_logs: admin read"
  on public.audit_logs for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Admin actions
create policy "admin_actions: admin only"
  on public.admin_actions for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ── Indexes ────────────────────────────────────────────────────────────────────

create index idx_profiles_email              on public.profiles(email);
create index idx_profiles_stripe_customer    on public.profiles(stripe_customer_id) where stripe_customer_id is not null;
create index idx_profiles_referral_code      on public.profiles(referral_code);
create index idx_workspaces_owner            on public.workspaces(owner_id);
create index idx_team_members_workspace      on public.team_members(workspace_id);
create index idx_team_members_user           on public.team_members(user_id);
create index idx_credit_events_user          on public.credit_events(user_id, created_at desc);
create index idx_conversations_user          on public.conversations(user_id, updated_at desc);
create index idx_messages_conversation       on public.messages(conversation_id, created_at asc);
create index idx_projects_owner              on public.projects(owner_id);
create index idx_projects_public             on public.projects(is_public) where is_public = true;
create index idx_deployments_project         on public.deployments(project_id, created_at desc);
create index idx_media_assets_user           on public.media_assets(user_id, created_at desc);
create index idx_api_keys_user               on public.api_keys(user_id);
create index idx_api_keys_hash               on public.api_keys(key_hash);
create index idx_analytics_events_user       on public.analytics_events(user_id, created_at desc);
create index idx_notifications_user_unread   on public.notifications(user_id, read) where read = false;
create index idx_support_tickets_user        on public.support_tickets(user_id, created_at desc);
create index idx_referrals_referrer          on public.referrals(referrer_id);
create index idx_referrals_email             on public.referrals(referred_email);

-- ── Realtime ─────────────────────────────────────────────────────────────────

-- Enable realtime for these tables in your Supabase dashboard under:
-- Database → Replication → Tables:
--   notifications, conversations, messages, projects, deployments
