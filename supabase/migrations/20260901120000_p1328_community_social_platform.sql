-- P1.3.28 — Community social platform: profiles, follows, comment likes, ranks, RLS

-- ── Public profile fields ───────────────────────────────────────────────────
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists public_profile_enabled boolean not null default false;
alter table public.profiles add column if not exists show_apps_on_profile boolean not null default false;
alter table public.profiles add column if not exists show_follower_count boolean not null default true;
alter table public.profiles add column if not exists allow_follows boolean not null default true;
alter table public.profiles add column if not exists follower_count integer not null default 0;
alter table public.profiles add column if not exists profile_visit_count integer not null default 0;
alter table public.profiles add column if not exists profile_visits_30d integer not null default 0;
alter table public.profiles add column if not exists community_rank text not null default 'new_builder';

-- ── user_follows ────────────────────────────────────────────────────────────
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx on public.user_follows (following_id, created_at desc);

alter table public.user_follows enable row level security;

drop policy if exists "user_follows: read authenticated" on public.user_follows;
create policy "user_follows: read authenticated"
  on public.user_follows for select
  using (auth.role() = 'authenticated');

drop policy if exists "user_follows: insert own" on public.user_follows;
create policy "user_follows: insert own"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "user_follows: delete own" on public.user_follows;
create policy "user_follows: delete own"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

-- ── profile_visits ────────────────────────────────────────────────────────────
create table if not exists public.profile_visits (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid not null references auth.users (id) on delete cascade,
  visitor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profile_visits_profile_idx on public.profile_visits (profile_user_id, created_at desc);

alter table public.profile_visits enable row level security;

drop policy if exists "profile_visits: insert authenticated" on public.profile_visits;
create policy "profile_visits: insert authenticated"
  on public.profile_visits for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "profile_visits: owner read" on public.profile_visits;
create policy "profile_visits: owner read"
  on public.profile_visits for select
  using (auth.uid() = profile_user_id);

-- ── discussion_reply_likes ──────────────────────────────────────────────────
create table if not exists public.discussion_reply_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  reply_id uuid not null references public.discussion_replies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, reply_id)
);

alter table public.discussion_reply_likes enable row level security;

drop policy if exists "discussion_reply_likes: read" on public.discussion_reply_likes;
create policy "discussion_reply_likes: read"
  on public.discussion_reply_likes for select using (true);

drop policy if exists "discussion_reply_likes: insert own" on public.discussion_reply_likes;
create policy "discussion_reply_likes: insert own"
  on public.discussion_reply_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "discussion_reply_likes: delete own" on public.discussion_reply_likes;
create policy "discussion_reply_likes: delete own"
  on public.discussion_reply_likes for delete
  using (auth.uid() = user_id);

-- ── nested replies ────────────────────────────────────────────────────────────
alter table public.discussion_replies add column if not exists parent_reply_id uuid references public.discussion_replies (id) on delete cascade;

-- ── discussion like count trigger ───────────────────────────────────────────
create or replace function public.bump_discussion_like_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.discussions set like_count = like_count + 1 where id = new.discussion_id;
  elsif tg_op = 'DELETE' then
    update public.discussions set like_count = greatest(0, like_count - 1) where id = old.discussion_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists discussion_likes_count on public.discussion_likes;
create trigger discussion_likes_count
  after insert or delete on public.discussion_likes
  for each row execute function public.bump_discussion_like_count();

-- ── reply count trigger ───────────────────────────────────────────────────────
create or replace function public.bump_discussion_reply_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.discussions set reply_count = reply_count + 1 where id = new.discussion_id;
  elsif tg_op = 'DELETE' then
    update public.discussions set reply_count = greatest(0, reply_count - 1) where id = old.discussion_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists discussion_replies_count on public.discussion_replies;
create trigger discussion_replies_count
  after insert or delete on public.discussion_replies
  for each row execute function public.bump_discussion_reply_count();

-- ── reply like count trigger ──────────────────────────────────────────────────
create or replace function public.bump_reply_like_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.discussion_replies set like_count = like_count + 1 where id = new.reply_id;
  elsif tg_op = 'DELETE' then
    update public.discussion_replies set like_count = greatest(0, like_count - 1) where id = old.reply_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists discussion_reply_likes_count on public.discussion_reply_likes;
create trigger discussion_reply_likes_count
  after insert or delete on public.discussion_reply_likes
  for each row execute function public.bump_reply_like_count();

-- ── follower count trigger ────────────────────────────────────────────────────
create or replace function public.bump_follower_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists user_follows_count on public.user_follows;
create trigger user_follows_count
  after insert or delete on public.user_follows
  for each row execute function public.bump_follower_count();

-- ── public profiles read (limited columns via view) ─────────────────────────
create or replace view public.public_profiles as
select
  id,
  username,
  display_name,
  avatar_url,
  bio,
  community_rank,
  follower_count,
  profile_visit_count,
  profile_visits_30d,
  public_profile_enabled,
  show_apps_on_profile,
  show_follower_count,
  allow_follows,
  created_at
from public.profiles
where coalesce(public_profile_enabled, false) = true
  and username is not null;

grant select on public.public_profiles to anon, authenticated;

drop policy if exists "profiles: public read limited" on public.profiles;
create policy "profiles: public read limited"
  on public.profiles for select
  using (
    auth.uid() = id
    or (
      coalesce(public_profile_enabled, false) = true
      and username is not null
    )
  );

-- ── groups grants ─────────────────────────────────────────────────────────────
grant select on public.groups to anon, authenticated;
grant select on public.group_members to authenticated;
grant select, insert, update, delete on public.group_messages to authenticated;

-- ── repair stale relative preview_url ───────────────────────────────────────
update public.projects
set preview_url = '/' || preview_url
where preview_url is not null
  and preview_url like 'api/projects/%'
  and preview_url not like '/api/projects/%';
