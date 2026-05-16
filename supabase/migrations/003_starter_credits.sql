-- ============================================================
-- DreamOS86 — Migration 003: Starter Credits on Signup
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================
--
-- FREE plan credit allocation:
--   100 credits (~$0.30 worth of AI usage at platform cost)
--   Enough for: 1 complex prompt OR ~10-15 lightweight Discuss messages
--
-- Credits are stored on profiles.credits_remaining.
-- A corresponding credit_events row is appended for audit purposes.

-- ── Update handle_new_user trigger to grant starter credits ──────────────────

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_now timestamptz := now();
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    credits_remaining,
    credits_reset_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    100,                            -- Free tier starter credits
    v_now + interval '1 month'     -- Reset exactly 1 month after signup
  )
  on conflict (id) do nothing;     -- Idempotent: skip if profile already exists

  return new;
end;
$$ language plpgsql security definer;

-- ── Grant starter credits to all EXISTING users who have 0 remaining ─────────
-- This backfills any existing free-plan users who signed up before this migration.

update public.profiles
set
  credits_remaining = 100,
  credits_reset_at  = (created_at + interval '1 month')
where
  plan_id = 'free'
  and credits_remaining = 0;

-- Append grant event for auditing (for existing users backfilled above)
insert into public.credit_events (
  user_id,
  operation_id,
  model_id,
  credits_consumed,
  event_type
)
select
  id,
  'starter_grant_migration_003',
  'system',
  -100,          -- negative = grant (credits added, not consumed)
  'grant'
from public.profiles
where
  plan_id = 'free'
  and credits_remaining = 100;
