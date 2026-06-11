-- Align media_assets with ZIP import inserts (idempotent).
alter table public.media_assets add column if not exists asset_type text;
alter table public.media_assets add column if not exists generated boolean not null default false;
alter table public.media_assets add column if not exists tags text[] not null default '{}'::text[];

create index if not exists idx_media_assets_project on public.media_assets (project_id, created_at desc);
