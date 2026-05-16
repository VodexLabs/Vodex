-- ============================================================
-- DreamOS86 — Migration 002: Media Storage Bucket + Guards
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- Ensure the media_assets table exists (idempotent guard)
create table if not exists public.media_assets (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,
  filename            text not null,
  storage_path        text not null,
  public_url          text not null,
  mime_type           text not null,
  size_bytes          bigint not null default 0,
  width               int,
  height              int,
  asset_type          text not null default 'image',
  generated           boolean not null default false,
  generation_prompt   text,
  tags                text[] not null default '{}'
);

-- Enable RLS
alter table public.media_assets enable row level security;

-- Drop+recreate policies to ensure they exist
drop policy if exists "media_assets: own only" on public.media_assets;
create policy "media_assets: own only"
  on public.media_assets for all using (user_id = auth.uid());

-- Indexes
create index if not exists idx_media_assets_user
  on public.media_assets(user_id, created_at desc);

create index if not exists idx_media_assets_project
  on public.media_assets(project_id, created_at desc);

-- ── Supabase Storage: "media" bucket ─────────────────────────────────────────
-- Create the bucket if it doesn't exist (idempotent).
-- Note: run this AFTER applying the SQL above, since storage is managed via
-- Supabase's internal API. You can also create the bucket from the dashboard:
--   Storage → New bucket → Name: "media" → Public: true
--
-- The following uses the storage helper schema (available in hosted Supabase):

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,  -- 50 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf', 'text/plain',
    'video/mp4', 'video/webm',
    'application/zip', 'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS policies (drop+recreate for idempotency)

drop policy if exists "media: authenticated upload"   on storage.objects;
drop policy if exists "media: owner update"           on storage.objects;
drop policy if exists "media: owner delete"           on storage.objects;
drop policy if exists "media: public read"            on storage.objects;

-- Authenticated users can upload to their own folder (user_id/<filename>)
create policy "media: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can update their own objects
create policy "media: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can delete their own objects
create policy "media: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone (including anon) can read public assets
create policy "media: public read"
  on storage.objects for select
  using (bucket_id = 'media');
